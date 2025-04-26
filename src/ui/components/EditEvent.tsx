import { DateTime } from "luxon";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarInfo, OFCEvent } from "../../types";
import moment from "moment";
import { AutocompleteInput } from "./AutoCompleteInput";
import { Plugin } from "obsidian";
import FullCalendarPlugin from "src/main";

function makeChangeListener<T>(
    setState: React.Dispatch<React.SetStateAction<T>>,
    fromString: (val: string) => T
): React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> {
    return (e) => setState(fromString(e.target.value));
}

interface DayChoiceProps {
    code: string;
    label: string;
    isSelected: boolean;
    onClick: (code: string) => void;
}
const DayChoice = ({ code, label, isSelected, onClick }: DayChoiceProps) => (
    <button
        type="button"
        style={{
            marginLeft: "0.25rem",
            marginRight: "0.25rem",
            padding: "0",
            backgroundColor: isSelected
                ? "var(--interactive-accent)"
                : "var(--interactive-normal)",
            color: isSelected ? "var(--text-on-accent)" : "var(--text-normal)",
            borderStyle: "solid",
            borderWidth: "1px",
            borderRadius: "50%",
            width: "25px",
            height: "25px",
        }}
        onClick={() => onClick(code)}
    >
        <b>{label[0]}</b>
    </button>
);

const DAY_MAP = {
    U: "Sunday",
    M: "Monday",
    T: "Tuesday",
    W: "Wednesday",
    R: "Thursday",
    F: "Friday",
    S: "Saturday",
};

const DaySelect = ({
    value: days,
    onChange,
}: {
    value: string[];
    onChange: (days: string[]) => void;
}) => {
    return (
        <div>
            {Object.entries(DAY_MAP).map(([code, label]) => (
                <DayChoice
                    key={code}
                    code={code}
                    label={label}
                    isSelected={days.includes(code)}
                    onClick={() =>
                        days.includes(code)
                            ? onChange(days.filter((c) => c !== code))
                            : onChange([code, ...days])
                    }
                />
            ))}
        </div>
    );
};

interface EditEventProps {
    submit: (frontmatter: OFCEvent, calendarIndex: number) => Promise<void>;
    readonly calendars: {
        id: string;
        name: string;
        type: CalendarInfo["type"];
    }[];
    defaultCalendarIndex: number;
    initialEvent?: Partial<OFCEvent>;
    editing?: boolean;
    open?: () => Promise<void>;
    deleteEvent?: () => Promise<void>;
    plugin: FullCalendarPlugin;
}

export const EditEvent = ({
    initialEvent,
    submit,
    open,
    deleteEvent,
    calendars,
    defaultCalendarIndex,
    editing,
    plugin,
}: EditEventProps) => {
    const [date, setDate] = useState(
        initialEvent
            ? initialEvent.type === "single"
                ? initialEvent.date
                : initialEvent.type === "recurring"
                ? initialEvent.startRecur
                : initialEvent.type === "rrule"
                ? initialEvent.startDate
                : ""
            : ""
    );
    const [endDate, setEndDate] = useState(
        initialEvent && initialEvent.type === "single"
            ? initialEvent.endDate
            : undefined
    );

    let initialStartTime = "";
    let initialEndTime = "";

    if (initialEvent) {
        // @ts-ignore
        const { startTime, endTime } = initialEvent;
        initialStartTime = startTime || "";
        initialEndTime = endTime || "";
    }

    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [title, setTitle] = useState(initialEvent?.title || "");
    const [isRecurring, setIsRecurring] = useState(
        initialEvent?.type === "recurring" || false
    );
    const [endRecur, setEndRecur] = useState("");

    const [daysOfWeek, setDaysOfWeek] = useState<string[]>(
        (initialEvent?.type === "recurring" ? initialEvent.daysOfWeek : []) ||
            []
    );

    const [allDay, setAllDay] = useState(initialEvent?.allDay || false);

    const [calendarIndex, setCalendarIndex] = useState(defaultCalendarIndex);

    const [complete, setComplete] = useState(
        initialEvent?.type === "single" &&
            initialEvent.completed !== null &&
            initialEvent.completed !== undefined
            ? initialEvent.completed
            : false
    );

    const [isTask, setIsTask] = useState(
        initialEvent?.type === "single" &&
            initialEvent.completed !== undefined &&
            initialEvent.completed !== null
    );

    const titleRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.focus();
        }
    }, [titleRef]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await submit(
            {
                ...{ title },
                ...(allDay
                    ? { allDay: true }
                    : {
                          allDay: false,
                          startTime: startTime || "",
                          endTime: endTime || "",
                      }),
                ...(isRecurring
                    ? {
                          type: "recurring",
                          daysOfWeek: daysOfWeek as (
                              | "U"
                              | "M"
                              | "T"
                              | "W"
                              | "R"
                              | "F"
                              | "S"
                          )[],
                          startRecur: date || undefined,
                          endRecur: endRecur || undefined,
                      }
                    : {
                          type: "single",
                          date: date || "",
                          endDate: endDate || null,
                          completed: isTask ? complete : null,
                      }),
            },
            calendarIndex
        );
    };

    const setDefinedEndTime = (
        value: moment.DurationInputArg1,
        type: moment.DurationInputArg2
    ) => {
        const dateTime = moment(`${date}T${startTime}`).add(value, type);
        setEndTime(dateTime.format("HH:mm"));
    };

    const modifyEndTime = (
        value: moment.DurationInputArg1,
        type: moment.DurationInputArg2,
        operation: "-" | "+"
    ) => {
        const dateTime = moment(`${date}T${endTime}`);

        if (operation == "-") {
            dateTime.subtract(value, type);
        } else {
            dateTime.add(value, type);
        }

        setEndTime(dateTime.format("HH:mm"));
    };

    const roundedNow = () => {
        const now = moment();

        const minutes = now.minute();
        const roundedMinutes = Math.round(minutes / 5) * 5;

        if (roundedMinutes === 60) {
            now.add(1, "hour").minutes(0);
        } else {
            now.minutes(roundedMinutes);
        }

        now.seconds(0);

        return now.format("HH:mm");
    };

    const setNow = () => {
        setEndTime(roundedNow());
    };

    useEffect(() => {
        const now = moment();

        if (date != now.format("YYYY-MM-DD")) {
            return;
        }

        if (editing) {
            return;
        }

        const start = moment(initialStartTime, "HH:mm");

        if (start.hour() != now.hour()) {
            return;
        }

        setStartTime(roundedNow());
    }, []);

    const renderEndTimeButtons = () => {
        return (
            <>
                <button type="button" onClick={(e) => setNow()}>
                    Now
                </button>
                <div>
                    <div className="edit-calendar-time-buttons">
                        <button
                            type="button"
                            onClick={(e) => {
                                setDefinedEndTime(5, "minute");
                            }}
                        >
                            5 min
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                modifyEndTime(5, "minute", "+");
                            }}
                        >
                            + 5 min
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                modifyEndTime(5, "minute", "-");
                            }}
                        >
                            - 5 min
                        </button>
                    </div>
                </div>
                <div>
                    <div className="edit-calendar-time-buttons">
                        <button
                            type="button"
                            onClick={(e) => {
                                setDefinedEndTime(10, "minute");
                            }}
                        >
                            10 min
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                modifyEndTime(10, "minute", "+");
                            }}
                        >
                            + 10 min
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                modifyEndTime(10, "minute", "-");
                            }}
                        >
                            - 10 min
                        </button>
                    </div>
                </div>
            </>
        );
    };

    const saveTitleForAutoComplete = () => {
        console.log(title);
        if (!title) {
            return;
        }

        plugin.settings.savedSuggestions.push(title);
        plugin.saveSettings();
    };

    return (
        <>
            <div>
                <p style={{ float: "right" }}>
                    {open && <button onClick={open}>Open Note</button>}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <p style={{ display: "flex" }}>
                    <AutocompleteInput
                        titleRef={titleRef}
                        onChange={setTitle}
                        value={title}
                        plugin={plugin}
                    />

                    <button type="button" onClick={saveTitleForAutoComplete}>
                        Save title
                    </button>
                </p>
                <p>
                    <select
                        id="calendar"
                        value={calendarIndex}
                        onChange={makeChangeListener(
                            setCalendarIndex,
                            parseInt
                        )}
                    >
                        {calendars
                            .flatMap((cal) =>
                                cal.type === "local" || cal.type === "dailynote"
                                    ? [cal]
                                    : []
                            )
                            .map((cal, idx) => (
                                <option
                                    key={idx}
                                    value={idx}
                                    disabled={
                                        !(
                                            initialEvent?.title === undefined ||
                                            calendars[calendarIndex].type ===
                                                cal.type
                                        )
                                    }
                                >
                                    {cal.type === "local"
                                        ? cal.name
                                        : "Daily Note"}
                                </option>
                            ))}
                    </select>
                </p>
                <p>
                    {!isRecurring && (
                        <input
                            type="date"
                            id="date"
                            value={date}
                            required={!isRecurring}
                            // @ts-ignore
                            onChange={makeChangeListener(setDate, (x) => x)}
                        />
                    )}

                    {allDay ? (
                        <></>
                    ) : (
                        <>
                            <input
                                type="time"
                                id="startTime"
                                value={startTime}
                                required
                                onChange={makeChangeListener(
                                    setStartTime,
                                    (x) => x
                                )}
                            />
                            -
                            <input
                                type="time"
                                id="endTime"
                                value={endTime}
                                required
                                onChange={makeChangeListener(
                                    setEndTime,
                                    (x) => x
                                )}
                            />
                        </>
                    )}
                </p>
                <div style={{ display: "flex" }}>
                    <div>
                        <p>
                            <label htmlFor="allDay">All day event </label>
                            <input
                                id="allDay"
                                checked={allDay}
                                onChange={(e) => setAllDay(e.target.checked)}
                                type="checkbox"
                            />
                        </p>
                        <p>
                            <label htmlFor="recurring">Recurring Event </label>
                            <input
                                id="recurring"
                                checked={isRecurring}
                                onChange={(e) =>
                                    setIsRecurring(e.target.checked)
                                }
                                type="checkbox"
                            />
                        </p>

                        {isRecurring && (
                            <>
                                <DaySelect
                                    value={daysOfWeek}
                                    onChange={setDaysOfWeek}
                                />
                                <p>
                                    Starts recurring
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={date}
                                        onChange={makeChangeListener(
                                            // @ts-ignore
                                            setDate,
                                            (x) => x
                                        )}
                                    />
                                    and stops recurring
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endRecur}
                                        onChange={makeChangeListener(
                                            setEndRecur,
                                            (x) => x
                                        )}
                                    />
                                </p>
                            </>
                        )}
                        <p>
                            <label htmlFor="task">Task Event </label>
                            <input
                                id="task"
                                checked={isTask}
                                onChange={(e) => {
                                    setIsTask(e.target.checked);
                                }}
                                type="checkbox"
                            />
                        </p>

                        {isTask && (
                            <>
                                <label htmlFor="taskStatus">Complete? </label>
                                <input
                                    id="taskStatus"
                                    checked={
                                        !(
                                            complete === false ||
                                            complete === undefined
                                        )
                                    }
                                    onChange={(e) =>
                                        setComplete(
                                            e.target.checked
                                                ? DateTime.now().toISO()
                                                : false
                                        )
                                    }
                                    type="checkbox"
                                />
                            </>
                        )}

                        <p
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                width: "100%",
                            }}
                        >
                            <button type="submit"> Save Event </button>
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: "5px",
                            flexDirection: "column",
                        }}
                    >
                        {!allDay && renderEndTimeButtons()}
                    </div>
                    <div style={{ flex: 1, alignContent: "end" }}>
                        <span style={{ float: "right" }}>
                            {deleteEvent && (
                                <button
                                    type="button"
                                    style={{
                                        backgroundColor:
                                            "var(--interactive-normal)",
                                        color: "var(--background-modifier-error)",
                                        borderColor:
                                            "var(--background-modifier-error)",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                    }}
                                    onClick={deleteEvent}
                                >
                                    Delete Event
                                </button>
                            )}
                        </span>
                    </div>
                </div>
            </form>
        </>
    );
};
