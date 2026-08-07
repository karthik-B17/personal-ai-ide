import json
import re
import time
import google.generativeai as genai
from app.config import MAX_AGENT_ITERATIONS, WORKSPACE_ROOT
from app.models import ToolCallLog
from app.tools import TOOL_SCHEMA, DISPATCH
from app import diff_store
from app.provider_manager import manager


def run_agent_turn(user_message: str, history: list[dict]) -> tuple[str, list[dict], list[ToolCallLog]]:
    system_prompt = f"""You are an autonomous coding assistant embedded in a personal IDE.
The user's project root is a workspace you can inspect and edit ONLY through tools.

**CRITICAL RULES FOR WRITING FILES:**
1. The `content` parameter of `write_file` MUST be a **string**.
2. If you are writing JSON (e.g., package.json, tsconfig.json), you MUST pass it as a **JSON string** – NOT a JSON object.
   Example: `"content": "{{\\"name\\": \\"my-app\\", \\"version\\": \\"1.0.0\\"}}"` (escaped quotes).
3. For HTML, CSS, JS, or any other text, pass the content as a normal string.
4. You can call `write_file` multiple times to create multiple files.
5. After writing all files, provide a final text response summarising what you created.

**Current workspace root:** {WORKSPACE_ROOT}

**User request:** {user_message}
"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    tool_log: list[ToolCallLog] = []

    for iteration in range(MAX_AGENT_ITERATIONS):
        def create_request(client, model, provider_name, messages, tools, tool_choice, temperature):
            if provider_name == "gemini":
                # ----- Gemini handling -----
                gemini_messages = []
                for m in messages:
                    role = "user" if m["role"] == "user" else "model"
                    gemini_messages.append({"role": role, "parts": [m["content"]]})

                gemini_tools = []
                for tool in tools:
                    func = tool.get("function", {})
                    gemini_tools.append(genai.types.Tool(
                        function_declarations=[{
                            "name": func.get("name"),
                            "description": func.get("description", ""),
                            "parameters": func.get("parameters", {}),
                        }]
                    ))

                response = client.GenerativeModel(model).generate_content(
                    gemini_messages,
                    generation_config=genai.types.GenerationConfig(temperature=temperature),
                    tools=gemini_tools
                )

                tool_calls = []
                content = ""
                if response.candidates:
                    candidate = response.candidates[0]
                    if candidate.content and candidate.content.parts:
                        for part in candidate.content.parts:
                            if part.function_call:
                                func_name = part.function_call.name
                                func_args = part.function_call.args
                                if hasattr(func_args, "items"):
                                    args_dict = dict(func_args.items())
                                else:
                                    args_dict = {}
                                tool_calls.append({
                                    "id": f"call_{len(tool_calls)}",
                                    "type": "function",
                                    "function": {
                                        "name": func_name,
                                        "arguments": json.dumps(args_dict),
                                    }
                                })
                            else:
                                content += part.text

                class DummyMessage:
                    def __init__(self, content, tool_calls):
                        self.content = content
                        self.tool_calls = tool_calls

                class DummyChoice:
                    def __init__(self, content, tool_calls):
                        self.message = DummyMessage(content, tool_calls)

                class DummyResponse:
                    def __init__(self, content, tool_calls):
                        self.choices = [DummyChoice(content, tool_calls)]

                return DummyResponse(content, tool_calls)

            else:
                # ----- OpenAI‑compatible (Groq, Hugging Face) -----
                return client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=tools,
                    tool_choice=tool_choice,
                    temperature=temperature,
                )

        try:
            response, provider = manager.try_providers(
                create_request,
                messages=messages,
                tools=TOOL_SCHEMA,
                tool_choice="auto",
                temperature=0.2,
            )
        except Exception as e:
            error_msg = str(e)
            # Try to extract the code from the error (fallback)
            match = re.search(r'"failed_generation":\s*({.*?})', error_msg, re.DOTALL)
            if match:
                try:
                    failed_gen = json.loads(match.group(1))
                    if "arguments" in failed_gen:
                        args = json.loads(failed_gen["arguments"])
                        if "content" in args:
                            code = args["content"]
                            fallback_reply = (
                                "I couldn't automatically save the file due to a tool‑call error. "
                                "Please copy the code below and save it manually:\n\n"
                                "```\n" + code + "\n```"
                            )
                            messages.append({"role": "assistant", "content": fallback_reply})
                            return fallback_reply, messages[1:], tool_log
                except:
                    pass

            error_msg_final = f"Error: All AI providers unavailable. Last error: {e}"
            messages.append({"role": "assistant", "content": error_msg_final})
            return error_msg_final, messages[1:], tool_log

        # Process the response
        choice = response.choices[0]
        msg = choice.message

        if not msg.tool_calls:
            # No tool calls → final answer
            messages.append({"role": "assistant", "content": msg.content or ""})
            new_history = messages[1:]
            return msg.content or "", new_history, tool_log

        # Record assistant's tool-call turn
        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc["id"] if isinstance(tc, dict) else tc.id,
                    "type": "function",
                    "function": {
                        "name": tc["function"]["name"] if isinstance(tc, dict) else tc.function.name,
                        "arguments": tc["function"]["arguments"] if isinstance(tc, dict) else tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ],
        })

        # Execute each tool call
        for tc in msg.tool_calls:
            if isinstance(tc, dict):
                name = tc["function"]["name"]
                args_str = tc["function"]["arguments"]
            else:
                name = tc.function.name
                args_str = tc.function.arguments

            try:
                args = json.loads(args_str or "{}")
            except json.JSONDecodeError:
                args = {}

            # Safety net: if content is an object, stringify it
            if "content" in args and isinstance(args["content"], dict):
                args["content"] = json.dumps(args["content"])

            fn = DISPATCH.get(name)
            if fn is None:
                result = f"ERROR: unknown tool '{name}'"
            else:
                try:
                    result = fn(**args)
                except TypeError as e:
                    result = f"ERROR: bad arguments for {name}: {e}"
                except Exception as e:
                    result = f"ERROR: {name} failed: {e}"

            tool_log.append(ToolCallLog(
                name=name, arguments=args,
                result_summary=(result[:200] + "...") if isinstance(result, str) and len(result) > 200 else str(result),
            ))

            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"] if isinstance(tc, dict) else tc.id,
                "name": name,
                "content": result if isinstance(result, str) else json.dumps(result),
            })

    # If we exit the loop without returning (hit iteration limit)
    fallback = "I stopped after reaching the tool‑call limit for this turn. Some files may not have been created. Please try again with a shorter request."
    messages.append({"role": "assistant", "content": fallback})
    return fallback, messages[1:], tool_log


def pending_diffs_payload():
    return [
        {
            "id": c.id,
            "path": c.path,
            "action": c.action,
            "diff_text": c.diff_text,
            "new_content": c.new_content,
        }
        for c in diff_store.list_pending()
    ]