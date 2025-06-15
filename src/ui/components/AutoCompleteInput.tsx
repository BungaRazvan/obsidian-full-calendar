import React, { ChangeEvent, useEffect, useState } from "react";
import FullCalendarPlugin from "src/main";

type AutocompleteInputProps = {
    value: string;
    titleRef: React.Ref<HTMLInputElement>;
    onChange: Function;
    plugin: FullCalendarPlugin;
};

export function AutocompleteInput(props: AutocompleteInputProps) {
    const { value, titleRef, onChange, plugin } = props;

    const [text, setText] = useState(value || "");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [suggestions, setSuggestions] = useState(
        plugin.settings.savedSuggestions || []
    );

    const matches = suggestions.filter(
        (s: string) =>
            s.toLocaleLowerCase().contains(text.toLocaleLowerCase()) &&
            text &&
            s !== text
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Tab" || e.key === "Enter") {
            e.preventDefault();
            setText(matches[highlightedIndex]);
            setHighlightedIndex(0);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((highlightedIndex + 1) % matches.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(
                (highlightedIndex - 1 + matches.length) % matches.length
            );
        }
    };

    const onChangeText = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) {
            setHighlightedIndex(0);
        }

        setText(e.target.value);
    };

    useEffect(() => {
        onChange(text);
    }, [text]);

    return (
        <div style={{ position: "relative", width: "300px" }}>
            <input
                ref={titleRef}
                type="text"
                value={text}
                placeholder="Add title"
                onChange={(e) => onChangeText(e)}
                onKeyDown={handleKeyDown}
                style={{
                    position: "relative",
                    background: "transparent",
                    width: "100%",
                    zIndex: 2,
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    letterSpacing: "inherit",
                    paddingLeft: "8px",
                    backgroundColor: "var(--background-modifier-form-field)",
                }}
            />

            {matches.length > 0 && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "8px",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                            width: "100%",
                            color: "#aaa",
                            zIndex: 1,
                            fontFamily: "inherit",
                            fontSize: "inherit",
                            letterSpacing: "inherit",
                            whiteSpace: "pre",
                            overflow: "hidden",
                        }}
                    >
                        <span style={{ color: "transparent" }}>{text}</span>
                        <span>
                            {matches[highlightedIndex].slice(text.length)}
                        </span>
                    </div>

                    <ul
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            border: "none",
                            listStyle: "none",
                            margin: 0,
                            padding: 0,
                            maxHeight: "150px",
                            overflowY: "auto",
                            zIndex: 100,
                        }}
                    >
                        {matches.map((suggestion, index) => (
                            <li
                                key={suggestion}
                                style={{
                                    padding: "8px",
                                    background:
                                        index === highlightedIndex
                                            ? "#eee"
                                            : "var(--interactive-normal)",
                                    color:
                                        index === highlightedIndex
                                            ? "#000"
                                            : "#fff",
                                    cursor: "pointer",
                                }}
                                onMouseDown={() => setText(suggestion)}
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
