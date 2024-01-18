import { useEffect, useRef, useState } from "react";
import { ColorPicker } from "../../components/ColorPicker";
import { NavBar } from "../../components/NavBar";
import { ITag } from "../../components/BookCard";
import { Tag } from "../../components/Tags";
import { api } from "../../database/api";
import DeleteIcon from "../../assets/DeleteIcon";
import SaveIcon from "../../assets/SaveIcon";

export function EditTags()
{
    const [tags, setTags] = useState<ITag[]>([]);
    const [colorPicking, setColorPicking] = useState<boolean[]>([]);
    const [actuallyEmpty, setActuallyEmpty] = useState<boolean[]>([]);
    const [delConfirm, setDelConfirm] = useState<boolean[]>([]);
    const colorPickerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const colorButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const textInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        api.get('tags').then(
            (response) => {
                const data = response.data;
                setColorPicking(data.map(() => false));
                setDelConfirm(data.map(() => false));
                setTags(data);
            }
        ).catch(
            (error) => console.log(`Error while retrieving tags: ${error}`)
        );
    }, []);

    useEffect(() => 
    {
        document.addEventListener('click', handleDocumentClick);

        return () => { document.removeEventListener('click', handleDocumentClick) };
    }, []);

    useEffect(() => {
        setActuallyEmpty(
            textInputRefs.current.map(ref => {
                if (ref && ref.value.trim() === '') 
                    return true;
                return false;
            })
        );
    }, [tags]);

    function handleDocumentClick(event: MouseEvent)
    {
        // If the click happened inside an active color picking <div>.
        if (colorPickerRefs.current.some(ref => ref && ref.contains(event.target as Node)))
            return;

        const colorButtonClickedIndex = colorButtonRefs.current.findIndex(
            ref => ref && ref.contains(event.target as Node)
        );

        if (colorButtonClickedIndex !== -1)
        {
            // Shows the color picking <div> for the respective tag; colapses all the others.
            setColorPicking((prevElements) => {
                return prevElements.map((elem, index) => 
                    index == colorButtonClickedIndex
                        ? !elem
                        : false
                );
            });

            return;
        }
        
        // Colapse all color picking <div>s if clicked anywhere else outside.
        setColorPicking((all) => all.map(() => false));
    };

    function handleLabelNameInput(label: string, index: number)
    {
        if (textInputRefs.current[index]?.value.trim() === '')
            return '';
        return label;   
    }

    function updateTagLabel(index: number, event: React.ChangeEvent<HTMLInputElement>)
    {
        let labelName = event.target.value.trim();

        if (labelName == '')
            labelName = "<empty>";

        setTags((prevElements) => {
            const currElements = [...prevElements];
            currElements[index] = { ...currElements[index], label: labelName };
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

    async function saveTag(index: number, event: React.MouseEvent<HTMLButtonElement, MouseEvent>)
    {
        // Validating the emptiness of the <input> instead of the label value itself
        // just in case some madman wants a tag named "<empty", for whatever reason.
        if (textInputRefs.current[index]?.value.trim() != '')
        {
            const tag = tags[index];
            await api.put(`tags/${tag.id}`, tag);
        }

        event.preventDefault();
    }

    function deleteConfirmation(value: boolean, index: number, event: React.MouseEvent<HTMLButtonElement, MouseEvent>)
    {
        setDelConfirm((prev) => {
            const curr = [...prev];
            curr[index] = value;
            return curr;
        });

        event.preventDefault();
    }

    async function deleteTag(index: number, event: React.MouseEvent<HTMLButtonElement, MouseEvent>)
    {
        await api.delete(`tags/${tags[index].id}`);

        const newTags = tags.filter((_, i) => i !== index);
        setDelConfirm(newTags.map(() => false));
        setTags(newTags);

        event.preventDefault();
    }

    return (
        <>
            <NavBar/>
            <div className = "edit-tags">
                <section className = "edit-tags__container">
                    <header className = "edit-tags__header">
                        <h1>Edit Tags</h1>
                    </header>
                    {tags.map((tag, index) => {
                        return (
                            <div key = {index} className = "edit-tags__tag-box">
                                {delConfirm[index] && (
                                    <div className = "edit-tags__tag-info">
                                        <p>Are you sure you want to delete "{tag.label}"?</p>
                                        <button 
                                            className = "edit-tags__button edit-tags__button--confirm"
                                            onClick = {(e) => deleteTag(index, e)}
                                        >Confirm</button>
                                        <button 
                                            className = "edit-tags__button edit-tags__button--cancel"
                                            onClick = {(e) => deleteConfirmation(false, index, e)}
                                        >Cancel</button>
                                    </div>
                                )}
                                {!delConfirm[index] && (
                                    <>
                                        <div className = "edit-tags__tag-info">
                                            <div className = "edit-tags__tag-container">
                                                <Tag  
                                                    label = {tag.label} 
                                                    color = {tag.color}
                                                    empty = {actuallyEmpty[index]}
                                                />
                                            </div>
                                            <label htmlFor = {tag.label + "name"}>{tag.label}</label>
                                            <input 
                                                className = "edit-tags__name-input"
                                                placeholder = "Must not be empty"
                                                onChange = {(e) => updateTagLabel(index, e)}
                                                value = {handleLabelNameInput(tag.label, index)} 
                                                ref = {(element) => textInputRefs.current[index] = element}
                                                id = {tag.label + "name"}
                                                type = "text" 
                                            />
                                            <button 
                                                className = "edit-tags__button edit-tags__button--color"
                                                style = {{ background: tag.color }}
                                                onClick = {(e) => e.preventDefault()}
                                                ref = {(element) => colorButtonRefs.current[index] = element}
                                            />
                                            <button
                                                className = "edit-tags__button edit-tags__button--save"
                                                onClick = {(e) => saveTag(index, e)}>
                                                <SaveIcon/>
                                            </button>
                                            <button
                                                className = "edit-tags__button edit-tags__button--delete" 
                                                onClick = {(e) => deleteConfirmation(true, index, e)}>
                                                <DeleteIcon/>
                                            </button>
                                        </div>
                                        {colorPicking[index] && (
                                            <div className = "edit-tags__tag-info" ref = {(element) => colorPickerRefs.current[index] = element}>
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
                </section>
            </div>
        </>
    )
}