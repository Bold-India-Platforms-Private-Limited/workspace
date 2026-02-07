import { useEffect, useRef } from "react";

const RichTextInput = ({ value, onChange, placeholder = "", className = "" }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== value) {
            ref.current.innerHTML = value || "";
        }
    }, [value]);

    const handleInput = (event) => {
        onChange?.(event.currentTarget.innerHTML);
    };

    return (
        <div
            ref={ref}
            contentEditable
            onInput={handleInput}
            data-placeholder={placeholder}
            className={`min-h-24 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-200 outline-none focus:border-blue-500 ${className}`}
            suppressContentEditableWarning
        />
    );
};

export default RichTextInput;