import { useEffect, useRef } from "react";
import { useQuill } from "react-quilljs";

const QuillEditor = ({ value = "", onChange, modules, formats, placeholder = "", className = "" }) => {
    const optionsRef = useRef({
        theme: "snow",
        modules,
        formats,
        placeholder,
    });

    const { quill, quillRef } = useQuill(optionsRef.current);

    const lastValueRef = useRef("");
    const isFocusedRef = useRef(false);
    const skipNextApplyRef = useRef(false);

    useEffect(() => {
        if (!quill) return;
        const handleSelection = (range) => {
            isFocusedRef.current = !!range;
        };
        quill.on("selection-change", handleSelection);
        const root = quill.root;
        const handleFocus = () => {
            isFocusedRef.current = true;
        };
        const handleBlur = () => {
            isFocusedRef.current = false;
        };
        root.addEventListener("focus", handleFocus);
        root.addEventListener("blur", handleBlur);
        return () => {
            quill.off("selection-change", handleSelection);
            root.removeEventListener("focus", handleFocus);
            root.removeEventListener("blur", handleBlur);
        };
    }, [quill]);

    useEffect(() => {
        if (!quill) return;
        const html = value || "";
        if (skipNextApplyRef.current) {
            skipNextApplyRef.current = false;
            return;
        }
        if (isFocusedRef.current) return;
        if (html !== lastValueRef.current) {
            quill.clipboard.dangerouslyPasteHTML(html || "");
            lastValueRef.current = html;
        }
    }, [quill, value]);

    useEffect(() => {
        if (!quill) return;
        const handler = () => {
            const html = quill.root.innerHTML;
            const cleaned = html === "<p><br></p>" ? "" : html;
            lastValueRef.current = cleaned;
            skipNextApplyRef.current = true;
            onChange?.(cleaned);
        };
        quill.on("text-change", handler);
        return () => {
            quill.off("text-change", handler);
        };
    }, [quill, onChange]);

    return (
        <div className={className}>
            <div ref={quillRef} />
        </div>
    );
};

export default QuillEditor;
