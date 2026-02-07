import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog";
import { useAuth } from "../auth/AuthContext";

function WorkspaceDropdown() {
    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isOpen, setIsOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { user } = useAuth();

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = (workspaceId) => {
        dispatch(setCurrentWorkspace(workspaceId))
        setIsOpen(false);
        navigate('/')
    }

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                <div className="flex items-center gap-3 min-w-0">
                    <img src={currentWorkspace?.image_url} alt={currentWorkspace?.name} className="w-8 h-8 rounded shadow" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate line-clamp-1">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {workspaces.map((workspace) => (
                            <div key={workspace.id} onClick={() => onSelectWorkspace(workspace.id)} className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                                <img src={workspace.image_url || ""} alt={workspace.name} className="w-6 h-6 rounded bg-gray-200 dark:bg-zinc-800" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate line-clamp-1">
                                        {workspace.name}
                                    </p>
                                    {user?.role === "ADMIN" && (
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                            {workspace.members?.length || 0} members
                                        </p>
                                    )}
                                </div>
                                {currentWorkspace?.id === workspace.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    {user?.role === "ADMIN" ? (
                        <div onClick={() => { setIsDialogOpen(true); setIsOpen(false); }} className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" >
                            <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                                <Plus className="w-4 h-4" /> Create Workspace
                            </p>
                        </div>
                    ) : (
                        <div className="p-2 rounded" >
                            <p className="flex items-center text-xs gap-2 my-1 w-full text-zinc-500 dark:text-zinc-400">
                                <Plus className="w-4 h-4" /> Only admins can create workspaces
                            </p>
                        </div>
                    )}
                </div>
            )}
            <CreateWorkspaceDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
        </div>
    );
}

export default WorkspaceDropdown;
