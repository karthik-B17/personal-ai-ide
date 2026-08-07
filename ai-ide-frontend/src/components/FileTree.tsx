// src/components/FileTree.tsx
import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import {
  fetchTree,
  createFolder,
  createFile,
  renameItem,
  deleteItem,
} from "../api";

const FileTree: React.FC = () => {
  const { tree, setTree, setSelectedPath, selectedPath } = useStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    isDir: boolean;
  } | null>(null);

  const loadTree = async () => {
    try {
      const data = await fetchTree();
      setTree(data);
    } catch (e) {
      console.error("Failed to load tree", e);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const handleRightClick = (
    e: React.MouseEvent,
    path: string,
    isDir: boolean,
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  const handleAction = async (action: string) => {
    if (!contextMenu) return;
    const { path, isDir } = contextMenu;
    setContextMenu(null);

    if (action === "newFile") {
      const name = prompt("Enter file name:");
      if (name) {
        const newPath = path ? `${path}/${name}` : name;
        await createFile(newPath);
        loadTree();
      }
    } else if (action === "newFolder") {
      const name = prompt("Enter folder name:");
      if (name) {
        const newPath = path ? `${path}/${name}` : name;
        await createFolder(newPath);
        loadTree();
      }
    } else if (action === "rename") {
      const newName = prompt("Enter new name:");
      if (newName) {
        const parent = path.substring(0, path.lastIndexOf("/"));
        const newPath = parent ? `${parent}/${newName}` : newName;
        await renameItem(path, newPath);
        loadTree();
      }
    } else if (action === "delete") {
      if (confirm(`Delete ${path}?`)) {
        await deleteItem(path);
        loadTree();
      }
    }
  };

  const renderNode = (node: any, parentPath: string = "") => {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isDir = node.is_dir;
    return (
      <li key={fullPath} style={{ marginLeft: "8px" }}>
        <div
          className={`tree-node ${selectedPath === fullPath ? "selected" : ""}`}
          onClick={() => {
            if (!isDir) {
              setSelectedPath(fullPath);
            }
          }}
          onContextMenu={(e) => handleRightClick(e, fullPath, isDir)}
          style={{ cursor: isDir ? "default" : "pointer", padding: "2px 4px" }}
        >
          {isDir ? "📁 " : "📄 "}
          {node.name}
        </div>
        {isDir && node.children && (
          <ul style={{ listStyle: "none", paddingLeft: "16px" }}>
            {node.children.map((child: any) => renderNode(child, fullPath))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="file-tree">
      {tree ? (
        <ul style={{ listStyle: "none", padding: "4px 0" }}>
          {tree.children?.map((child: any) => renderNode(child))}
        </ul>
      ) : (
        <div className="text-ink-muted p-2">Loading...</div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: "#22242B",
            border: "1px solid #2C2F38",
            borderRadius: "4px",
            padding: "4px 0",
            zIndex: 1000,
            minWidth: "150px",
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div className="menu-item" onClick={() => handleAction("newFile")}>
            New File
          </div>
          <div className="menu-item" onClick={() => handleAction("newFolder")}>
            New Folder
          </div>
          <div className="menu-item" onClick={() => handleAction("rename")}>
            Rename
          </div>
          <div className="menu-item" onClick={() => handleAction("delete")}>
            Delete
          </div>
        </div>
      )}
    </div>
  );
};

export default FileTree;
