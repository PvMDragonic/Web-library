import { 
    Ref,
    forwardRef,
    useImperativeHandle, 
    useEffect, 
    useRef, 
    useState, 
    useContext
} from "react";
import { useTranslation } from "react-i18next";
import { SearchBar, SearchBarHandle } from '../SearchBar';
import { useHasScrollbar } from "../../hooks/useHasScrollbar";
import { useEnlarger } from '../../hooks/useEnlarger';
import { ColorModeContext } from "../ColorScheme";
import { DropdownEntry } from '../DropdownEntry';
import { ColorPicker } from '../ColorPicker';
import { XContainer } from '../XContainer';
import { IBook, ITag } from '../BookCard';
import { Tag } from '../Tags';
import PlusCircleIcon from "../../assets/PlusCircleIcon";

const emptyTag = 
{
    id: -1,
    label: "",
    color: "#FF9999"
}

interface DropdownMenu 
{
    tags: ITag[];
    book: IBook; 
    setTags: React.Dispatch<React.SetStateAction<ITag[]>>;
    setBook: React.Dispatch<React.SetStateAction<IBook>>;
}

export interface DropdownMenuHandle
{
    focus: () => void;
}

function DropdownMenuComponent({ tags, book, setTags, setBook }: DropdownMenu, ref: Ref<DropdownMenuHandle>)
{
    const [availableOptions, setAvailableOptions] = useState<ITag[]>([]);
    const [newTagValue, setNewTagValue] = useState<ITag>(emptyTag);
    const [errorVisible, setErrorVisisble] = useState<boolean>(false);
    const [colorPicking, setColorPicking] = useState<boolean>(false);
    const [showOptions, setShowOptions] = useState<boolean>(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listWrapperRef = useRef<HTMLDivElement>(null);
    const searchBarRef = useRef<SearchBarHandle>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const { t } = useTranslation();
    const { colorMode } = useContext(ColorModeContext);
    const { limitSize } = useEnlarger({ parentRef: dropdownRef}); 
    const { hasScroll } = useHasScrollbar({ 
        elementRef: listWrapperRef,
        altCompareRef: listRef 
    });

    useImperativeHandle(ref, () => ({
        focus: () => {
            setShowOptions(true);
            // Has to wait for it to be rendered first before focusing.
            setTimeout(() => listWrapperRef.current?.focus(), 50);
        }
    }));

    // Called whenever a click happens inside the dropdown menu.
    useEffect(() => 
    {
        function handleDocumentClick(event: MouseEvent)
        {
            // If the click event occurred outside the search input element.
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) 
                closeDropdown();
        };

        document.addEventListener('click', handleDocumentClick);

        return () => { document.removeEventListener('click', handleDocumentClick) };
    }, []);

    useEffect(() => 
    {
        if (newTagValue != emptyTag)
            setNewTagValue(emptyTag);
    }, [book.tags]);

    useEffect(() => 
    {
        setErrorVisisble(
            tags.some(tag => tag.label === newTagValue.label)
        );
    }, [newTagValue]);

    useEffect(() => setAvailableOptions(tags), [tags]);

    function addTag()
    {
        if (newTagValue == null || newTagValue.label == '' || errorVisible)
            return;
    
        if (!tags.includes(newTagValue))
            setTags([newTagValue, ...tags]);
        
        if (colorPicking)
            setColorPicking(false);

        handleOptionToggle(newTagValue);
    }

    // Can't be used for the add button cuz of different event.
    function handleNewTagInput(event: React.KeyboardEvent<HTMLInputElement>)
    {
        if (event.key !== 'Enter')
            return;

        // Makes so it wont trigger the 'required' property on the Title field.
        event.preventDefault();

        addTag();
    }

    function handleOptionToggle(option: ITag, event?: React.MouseEvent)
    {
        // Prevents the menu from opening when a tag is removed.
        if (event) event.stopPropagation();

        setBook((prevSelected) => 
        {
            return { 
                ...prevSelected, 
                ['tags']: checkIncludedTag(option)
                    ? prevSelected.tags.filter(tag => tag.label !== option.label)
                    : [...prevSelected.tags, option]
            }
        });
    }

    function handleSelectAllToggle()
    {
        setBook(prevSelected => 
        {
            return { 
                ...prevSelected, 
                ['tags']: 
                    // If all are selected, remove those; else, add ones not selected.
                    availableOptions.every(tag => prevSelected.tags.some(option => option.id === tag.id))
                        ? prevSelected.tags.filter(tag => !availableOptions.some(option => option.id === tag.id))  
                        : [...prevSelected.tags, ...availableOptions.filter(
                            tag => !prevSelected.tags.some(option => option.id === tag.id)
                        )] 
            }
        });
    }

    function handleNavigation(event: React.KeyboardEvent)
    {
        if (event.key === 'Escape' && showOptions)
        {
            event.preventDefault();
            dropdownRef.current?.focus();
            closeDropdown();
        }

        if (event.key === 'Enter' && !showOptions)
        {
            event.preventDefault();
            setShowOptions(true);
            setTimeout(() => listWrapperRef.current?.focus(), 50);
        }
    }

    function closeDropdown()
    {
        setColorPicking(false);
        setShowOptions(false);
        setErrorVisisble(false);
        setNewTagValue(emptyTag);

        if (searchBarRef.current)
            searchBarRef.current.setSearch('');
    }

    function checkIncludedTag(option: ITag)
    {
        return book.tags.some(tag =>
            tag.id === option.id && tag.label === option.label
        )
    }

    function filterOptions(searchValue: string, toggleCase: boolean, wholeWord: boolean)
    {
        const search = toggleCase ? searchValue : searchValue.toLowerCase();

        setAvailableOptions(
            search === ''
                ? tags
                : tags.filter(tag => {
                    const label = toggleCase ? tag.label : tag.label.toLowerCase();
                    return wholeWord ? label === search : label.includes(search);
                })
        );
    }
    
    return (
        <div 
            className = {`dropdown dropdown--${colorMode}`} 
            onClick = {() => setShowOptions(true)}
            onKeyDown = {(e) => handleNavigation(e)}
            style = {{ cursor: !showOptions ? "pointer" : "auto" }} 
            ref = {dropdownRef}
            tabIndex = {0}
        >
            <p 
                className = {`dropdown__tag-dupe dropdown__tag-dupe--${colorMode}`}
                style = {{ 
                    display: errorVisible ? 'block' : 'none',
                    top: colorPicking ? '0.75rem' : '3.55rem' 
                }}
            >
                {t('tagAlreadyExistsText')}
            </p>
            <div 
                className = {`dropdown__container dropdown__container--${colorMode}`}
                style = {{ display: showOptions ? 'flex' : 'none' }}
                ref = {listWrapperRef}
                tabIndex = {0}
            >
                {!colorPicking && (
                    <SearchBar
                        ref = {searchBarRef}
                        onChange = {filterOptions}
                    />
                )}
                <div className = "dropdown__new-tag-container">
                    <button 
                        type = "button" 
                        title = {t('addNewTagBtnTitle')}
                        className = "dropdown__add-button"
                        onClick = {() => addTag()}
                    >
                        <PlusCircleIcon/>
                    </button>
                    <button 
                        type = "button"
                        title = {t('toggleColorPickingTitle')} 
                        className = {`dropdown__color-select dropdown__color-select--${colorMode}`}
                        style = {{ background: newTagValue.color }}
                        onClick = {() => setColorPicking(!colorPicking)}
                    />
                    <div className = "dropdown__new-tag-wrapper">
                        {colorPicking && (
                            <div className = "dropdown__tag-wrapper">
                                <Tag
                                    key = {newTagValue.id}
                                    color = {newTagValue.color}
                                    label = {newTagValue.label || '<empty>'}
                                    empty = {newTagValue.label == ''}
                                />
                            </div>
                        )}
                        <label className = "dropdown__hide-label" htmlFor = "newTagInput">
                            {t('newTagInputText')}
                        </label>
                        <input
                            id = "newTagInput"
                            placeholder = {t('newTagPlaceholderText')}
                            className = {`dropdown__new-tag dropdown__new-tag--${colorMode}`}
                            value = {newTagValue.label}
                            onChange = {(e) => setNewTagValue({ ...newTagValue, label: e.target.value })}
                            onKeyDown = {handleNewTagInput}
                        />
                    </div>
                    {colorPicking ? (
                        <div className = "dropdown__color-picker-wrapper">
                            <ColorPicker
                                tag = {newTagValue}
                                setTag = {(value) => setNewTagValue({ ...newTagValue, color: value })}
                            />
                        </div>
                    ) : (
                        <>
                            {availableOptions.length > 0 ? (
                                <div 
                                    ref = {listRef}
                                    className = {`dropdown__list dropdown__list--${colorMode}`}
                                    style = {{ paddingRight: hasScroll ? '0.25rem' : '0rem' }} 
                                >
                                    <div onClick = {handleSelectAllToggle}>
                                        <div className = {`dropdown__checkbox dropdown__checkbox--${colorMode}`}>
                                            <input 
                                                id = "selectAll"
                                                type = "checkbox" 
                                                checked = {availableOptions.every(tag => checkIncludedTag(tag))}
                                                readOnly 
                                            />
                                        </div>
                                        <label htmlFor = "selectAll">{t('selectAllTagsText')}</label>
                                    </div>
                                    <span className = "dropdown__separator-line"/>
                                    {availableOptions.map((option, index) => (
                                        <DropdownEntry
                                            key = {index}
                                            optLabel = {option.label}
                                            checked = {checkIncludedTag(option)} 
                                            onClick = {() => handleOptionToggle(option)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className = {`dropdown__no-tags dropdown__no-tags--${colorMode}`}>
                                    {t('noTagAvailableText')}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
            {book.tags.map((option, index) => (
                <XContainer
                    key = {`${option.label}${index}`}
                    text = {option.label}
                    color = {option.color}
                    limitSize = {limitSize}
                    onClick = {(e) => handleOptionToggle(option, e)}
                />
            ))}
        </div>
    );
};

// Creates an optional custom ref for the component.
export const DropdownMenu = forwardRef(DropdownMenuComponent);