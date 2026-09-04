import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Database, ArrowRight, FileText, FolderOpen } from "lucide-react";

// Dashboard section: one card per dataset folder attached to a project the
// current user is assigned to. If a member has 2 projects and 4 dataset folders
// between them, all 4 cards show. Tapping a card opens that project's Documents
// tab, where files can be previewed / downloaded.
export default function DatasetsSection() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const currentWorkspace = useSelector((s) => s.workspace?.currentWorkspace || null);

    const cards = useMemo(() => {
        const projects = currentWorkspace?.projects || [];
        const userId = user?.id;
        const isAdmin = user?.role === "ADMIN";

        const visible = projects.filter((p) => {
            if (isAdmin) return true;
            if (p.team_lead === userId) return true;
            if ((p.members || []).some((m) => m.userId === userId)) return true;
            return (p.groups || []).some((g) =>
                (g.group?.members || g.members || []).some((m) => m.userId === userId)
            );
        });

        const out = [];
        for (const p of visible) {
            for (const doc of p.documents || []) {
                if (!doc.datasetFolder) continue; // dataset docs only
                out.push({
                    key: doc.id,
                    projectId: p.id,
                    projectName: p.name,
                    title: doc.title || doc.datasetFolder.name,
                    folderName: doc.datasetFolder.name,
                    fileCount: doc.datasetFolder._count?.files || 0,
                    createdAt: doc.createdAt,
                });
            }
        }
        return out.sort((a, b) => b.fileCount - a.fileCount);
    }, [currentWorkspace, user]);

    if (cards.length === 0) return null;

    const projectCount = new Set(cards.map((c) => c.projectId)).size;
    const open = (id) => navigate(`/projectsDetail?id=${id}&tab=documents`);

    return (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                    <Database size={16} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm sm:text-base">Datasets</h3>
                    <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                        {cards.length} folder{cards.length !== 1 ? "s" : ""} across {projectCount} project{projectCount !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => open(c.projectId)}
                        className="group text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 p-3.5 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition"
                    >
                        <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                <FolderOpen size={15} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 line-clamp-2 leading-snug">{c.folderName}</p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">in {c.projectName}</p>
                            </div>
                            <ArrowRight size={15} className="shrink-0 mt-0.5 text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                <FileText size={11} /> {c.fileCount} file{c.fileCount !== 1 ? "s" : ""}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                Open <ArrowRight size={12} />
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
