import { useEffect, useRef, useState } from "react";
import { DeleteAllMessage } from "../../components/DeleteAllMessage";
import { useHasScrollbar } from "../../hooks/useHasScrollbar";
import { ColorPicker } from "../../components/ColorPicker";
import { SearchBar } from "../../components/SearchBar";
import { NavBar } from "../../components/NavBar";
import { ITag } from "../../components/BookCard";
import { Tag } from "../../components/Tags";
import { api } from "../../database/api";
import PlusCircleIcon from "../../assets/PlusCircleIcon";
import DeleteIcon from "../../assets/DeleteIcon";
import SaveIcon from "../../assets/SaveIcon";

const blankTag = 
{
    id: -1,
    label: "<empty>",
    color: "#FF9999",
    colorPicking: false,
    delConfirm: false,
    disabled: false,
    available: true,
    empty: true  
}

export type Tags = ITag & 
{ 
    colorPicking: boolean,
    delConfirm: boolean,
    available: boolean,
    disabled: boolean, 
    empty: boolean
};

export function EditTags()
{
    const [tags, setTags] = useState<Tags[]>([]);
    const [deleteMsg, setDeleteMsg] = useState(false);

    const colorPickerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const colorButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const textInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const containerRef = useRef<HTMLTableSectionElement>(null);

    // Needs a ref to keep 'tags' accessible inside 'handleDocumentClick'.
    const tagsRef = useRef<Tags[]>(tags);
    
    const { hasScroll } = useHasScrollbar({ 
        elementRef: containerRef 
    });

    useEffect(() => 
    {
        api.get('tags').then(
            (response) => setTags(
                // Database lacks the added attributes from 'Tags' type.
                response.data.map((tag: ITag) => ({
                    ...tag,
                    colorPicking: false,
                    delConfirm: false,
                    disabled: false,
                    available: true,
                    empty: false
                }))
            )
        ).catch(
            (error) => console.log(`Error while retrieving tags: ${error}`)
        );
    }, []);

    useEffect(() => 
    {
        function handleDocumentClick(event: MouseEvent)
        {
            const activeIndex = tagsRef.current.findIndex(tag => tag.colorPicking);
            if (activeIndex === -1) return;

            const targetNode = event.target as Node;
            const clickedColorPickerButton = colorButtonRefs.current.some(ref => ref && ref.contains(targetNode));
            const clickedColorPickingDiv = colorPickerRefs.current.some(ref => ref && ref.contains(targetNode));
            if (clickedColorPickerButton || clickedColorPickingDiv) return;

            setTags((prevElements) => {
                const currElements = [...prevElements];
                currElements[activeIndex] = { ...currElements[activeIndex], colorPicking: false };
                return currElements;
            });
        };

        document.addEventListener('click', handleDocumentClick);

        return () => { document.removeEventListener('click', handleDocumentClick) };
    }, []);

    useEffect(() => 
    {
        tagsRef.current = tags;
    }, [tags]);

    useEffect(() => 
    {
        if (!deleteMsg) return;

        const container = containerRef.current;
        if (!container) return;

        // Scrolls the main <section> to prevent a broken visual state during <DeleteAllMessage>.
        container.scrollTop = 0;
    }, [deleteMsg]);

    function handleLabelNameInput(label: string, index: number)
    {
        if (tags[index].empty)
            return '';
        return label;   
    }

    function checkExistingTag(tagLabel: string)
    {
        const uniques = tags.filter(tag => tag.label === tagLabel);
        return uniques.length > 0;
    }

    function updateTagLabel(index: number, event: React.ChangeEvent<HTMLInputElement>)
    {
        const labelName = event.target.value;

        setTags((prevElements) => 
        {
            const currElements = [...prevElements];
            currElements[index] = {
                ...currElements[index],
                disabled: checkExistingTag(labelName),
                label: labelName === '' ? "<empty>" : labelName,
                empty: labelName === ''
            };
            return currElements;
        });
    }

    function updateTagColor(index: number, color: string)
    {
        setTags((prevElements) => {
            const currElements = [...prevElements];
            currElements[index] = { ...currElements[index], color: color };
            return currElements;
        });
    }

    function colorPickerButton(clickedIndex: number)
    {
        // Shows color picking <div> based on pressed button; collapses all others.
        setTags(
            prev => prev.map((tag, index) => ({ 
                ...tag, 
                colorPicking: index === clickedIndex 
                    ? !tag.colorPicking 
                    : false 
            })
        ));
    }

    async function saveTag(index: number)
    {
        // Validating the emptiness of the <input> instead of the label value itself
        // just in case some madman wants a tag named "<empty>", for whatever reason.
        if (textInputRefs.current[index]?.value.trim() != '')
        {
            const tag = tags[index];
            if (tag.id === -1)
            {
                const response = await api.post(`tags/new`, { ...tag, label: tag.label.trim()});
                const newTag = response.data.tag;

                // It needs the actual id for future changes, instead of the temporary -1 id.
                setTags((prevElements) => {
                    const currElements = [...prevElements];
                    currElements[index] = { ...currElements[index], id: newTag.id };
                    return currElements;
                });
            }
            else
            {
                await api.put(`tags/${tag.id}`, tag);
            }
        }
    }

    function deleteConfirmation(value: boolean, index: number)
    {
        setTags((prev) => {
            const curr = [...prev];
            curr[index] = { ...curr[index], delConfirm: value };
            return curr;
        });
    }

    async function deleteTag(tagId: number, index: number)
    {
        if (tagId != -1)
            await api.delete(`tags/${tagId}`);

        // Can't remove using .filter() and tag.id because of 
        // (potentially) dupes of new empty tags with -1 for id.
        setTags((prev) => [
            ...prev.slice(0, index),
            ...prev.slice(index + 1)
        ]);
    }

    function filterOptions(searchValue: string, toggleCase: boolean, wholeWord: boolean)
    {
        const search = toggleCase ? searchValue : searchValue.toLowerCase();

        setTags(prev =>
            prev.map(tag => {
                const label = toggleCase ? tag.label : tag.label.toLowerCase();
                return {
                    ...tag,
                    available: wholeWord ? label === search : label.includes(search)
                };
            })
        );
    }

    const containerClass = `edit-tags__container edit-tags__container--${
        hasScroll && !deleteMsg ? 'scroll' : 'no-scroll'
    }`;

    return (
        <>
            <NavBar/>
            <div className = "edit-tags">
                <section 
                    className = {containerClass}
                    style = {{ overflow: deleteMsg ? 'hidden' : 'auto' }}
                    ref = {containerRef}
                >
                    <header className = "edit-tags__header">
                        <div>
                            <h1>Edit tags</h1>
                        </div>
                        {!deleteMsg && (
                            <div>
                                {tags.some(tag => tag.available) && (
                                    <button 
                                        type = "button" 
                                        className = "edit-tags__button edit-tags__button--del-all" 
                                        onClick = {() => setDeleteMsg(true)}
                                    >
                                        <DeleteIcon/>
                                        ‎ Delete all
                                    </button>
                                )}
                                <button 
                                    type = "button" 
                                    className = "edit-tags__button edit-tags__button--new-tag" 
                                    onClick = {() => setTags((prev) => [blankTag, ...prev])}
                                >
                                    <PlusCircleIcon/>
                                    ‎ New tag
                                </button>
                            </div>
                        )}
                    </header>
                    {deleteMsg && (
                        <DeleteAllMessage
                            tags = {tags}
                            setTags = {setTags}
                            setDeleteMsg = {setDeleteMsg}
                        />
                    )}
                    {tags.length !== 0 && (
                        <SearchBar
                            onChange = {filterOptions}
                        />
                    )}
                    {tags.some(tag => tag.available) ? (
                        <>
                            {tags.map((tag, index) => {
                                return tag.available && (
                                    <div key = {index} className = "edit-tags__tag-box">
                                        {tag.delConfirm && (
                                            <div className = "edit-tags__tag-info">
                                                <span className = "edit-tags__deletion-message">
                                                    <b>Are you sure you want to delete</b> <Tag  
                                                        label = {tag.label} 
                                                        color = {tag.color}
                                                        empty = {tag.empty}
                                                        minWidth = {true}
                                                    /><b>?</b>
                                                </span>
                                                <div className = "edit-tags__del-screen-container">
                                                    <button
                                                        type = "button"
                                                        className = "edit-tags__button edit-tags__button--confirm"
                                                        onClick = {() => deleteTag(tag.id, index)}
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        type = "button"
                                                        className = "edit-tags__button edit-tags__button--cancel"
                                                        onClick = {() => deleteConfirmation(false, index)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {!tag.delConfirm && (
                                            <>
                                                <div className = "edit-tags__tag-info">
                                                    <div className = "edit-tags__tag-container">
                                                        <Tag  
                                                            label = {tag.label} 
                                                            color = {tag.color}
                                                            empty = {tag.empty}
                                                        />
                                                    </div>
                                                    <label 
                                                        htmlFor = {tag.label + "name"}
                                                        className = "edit-tags__tag-label"
                                                    >
                                                        {tag.label}
                                                    </label>
                                                    <input 
                                                        className = {`edit-tags__input${tag.disabled ? ' edit-tags__input--disabled' : ''}`}
                                                        placeholder = "Must not be empty"
                                                        onChange = {(e) => updateTagLabel(index, e)}
                                                        value = {handleLabelNameInput(tag.label, index)} 
                                                        ref = {(element) => textInputRefs.current[index] = element}
                                                        id = {tag.label + "name"}
                                                        type = "text" 
                                                    />
                                                    <div className = "edit-tags__tag-info-buttons-container">
                                                        <button 
                                                            type = "button" 
                                                            title = "Toggle color-picking interface"
                                                            className = "edit-tags__button edit-tags__button--color"
                                                            style = {{ background: tag.color }}
                                                            ref = {(element) => colorButtonRefs.current[index] = element}
                                                            onClick = {() => colorPickerButton(index)}
                                                        />
                                                        <button
                                                            type = "button" 
                                                            title = "Save changes"
                                                            className = "edit-tags__button edit-tags__button--save"
                                                            onClick = {() => saveTag(index)}
                                                            disabled = {tag.disabled || tag.empty}>
                                                            <SaveIcon/>
                                                        </button>
                                                        <button
                                                            type = "button" 
                                                            title = "Delete tag"
                                                            className = "edit-tags__button edit-tags__button--delete" 
                                                            onClick = {() => deleteConfirmation(true, index)}>
                                                            <DeleteIcon/>
                                                        </button>
                                                    </div>
                                                </div>
                                                {tag.colorPicking && (
                                                    <div 
                                                        className = "edit-tags__tag-info" 
                                                        ref = {(element) => colorPickerRefs.current[index] = element}
                                                        style = {{ paddingBottom: tag.colorPicking ? '0.25rem' : '' }}
                                                    >
                                                        <ColorPicker
                                                            tag = {tag}
                                                            setTag = {(value) => updateTagColor(index, value)}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </>
                    ) : (
                        <h2>Such wow, much empty!</h2>
                    )}
                </section>
            </div>
        </>
    )
}