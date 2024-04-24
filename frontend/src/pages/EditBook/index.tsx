import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DeleteMessage } from "../../components/DeleteMessage";
import { FileSelector } from "../../components/FileSelector";
import { DropdownMenu } from "../../components/DropdownMenu";
import { IBook, ITag } from "../../components/BookCard";
import { NavBar } from "../../components/NavBar";
import { blankBook } from "../NewBook";
import { api } from "../../database/api";

export function EditBook() 
{
    const [book, setBook] = useState<IBook>(blankBook);
    const [tags, setTags] = useState<ITag[]>([]);
    const [includedTags, setIncludedTags] = useState<ITag[]>([]);
    const [fuckingLoading, setFuckingLoading] = useState<number>(0);
    const [deleteMsg, setDeleteMsg] = useState(false);

    const mainBodyRef = useRef<HTMLDivElement>(null);

    const { id } = useParams();

    const navigate = useNavigate();

    useEffect(() =>
    {
        api.get(`books/id/${id}`)
            .then((response) => {
                const respData = response.data[0];
                setBook({
                    ...respData,
                    release: respData.release !== null 
                        ? new Date(respData.release).toISOString().split('T')[0] 
                        : undefined
                });
            })
            .catch((error) => {
                console.log(`Error retrieving book: ${error}`);
            });

        api.get(`tags`)
            .then((response) => {
                setTags(response.data);
            })
            .catch((error) => {
                console.log(`Error retrieving tags: ${error}`);
            });

        api.get(`tags/id/${id}`)
            .then((response) => {
                setIncludedTags(response.data);
            })
            .catch((error) => {
                console.log(`Error retrieving included tags: ${error}`);
            });
    }, []);

    function editBook(event: React.ChangeEvent<HTMLInputElement>) 
    {
        const { name, value } = event.target;
        setBook({ ...book, [name]: value });
    }

    async function saveBook(event: React.FormEvent<HTMLFormElement>) 
    {
        event.preventDefault();

        try 
        {
            setFuckingLoading(2);
            await api.put(`books/${id}`, book);

            // Easier to wipe and start fresh. 
            await api.delete(`tags/relationship/${id}`);

            for (const tag of includedTags)
            {
                // Needs to escape special characters to not bug the API with chars like '?'.
                const tagLabel = encodeURIComponent(tag.label);
                const tagExists = (await api.get(`tags/name/${tagLabel}`)).data[0];

                if (!tagExists)
                    await api.post('tags/new', tag);

                const addedTag = (await api.get(`tags/name/${tagLabel}`)).data[0];
                await api.post('tags/add', 
                { 
                    bookId: id, 
                    tagId: addedTag.id 
                });
            }

            navigate('/');
        } 
        catch (error) 
        {
            console.log(error);
            setFuckingLoading(0);
        }
    }

    if (deleteMsg)
        return (
            <DeleteMessage 
                id = {book.id} 
                title = {book.title} 
                abortDeletion = {setDeleteMsg}
            />
        )

    return (
        <>
            <NavBar
                mobile = {675}
                mainBodyRef = {mainBodyRef}
            />
            <div className = "book-form">
                <h2 
                    className = "book-form__saving book-form__saving--unselect"
                    style = {{display: fuckingLoading == 2 ? 'flex' : 'none'}}
                >
                    Saving...
                </h2>

                <form 
                    onSubmit = {saveBook}
                    style = {{
                        pointerEvents: fuckingLoading != 0 ? 'none' : 'all',
                        opacity: fuckingLoading != 0 ? '50%' : '100%',
                        position: 'relative'
                    }}
                >
                    <header>
                        <h1>Edit book</h1>
                        <button 
                            type = "button" 
                            className = "book-form__button book-form__button--delete" 
                            onClick = {() => setDeleteMsg(true)}
                        >
                            Delete book
                        </button>
                    </header>

                    <div className = "book-form__container">
                        <div style = {{width: "50%"}}>
                            <div className = "book-form__field">
                                <label htmlFor = "title">Title:</label>
                                <input 
                                    id = "title" 
                                    type = "text" 
                                    name = "title" 
                                    className = "book-form__input" 
                                    value = {book.title} 
                                    onChange = {(e) => editBook(e)} 
                                    required 
                                />
                            </div>

                            <div className = "book-form__field">
                                <label htmlFor = "author">Author:</label>
                                <input 
                                    id = "author" 
                                    type = "text" 
                                    name = "author" 
                                    className = "book-form__input" 
                                    value = {book.author} 
                                    onChange = {(e) => editBook(e)} 
                                />
                            </div>

                            <div className = "book-form__field">
                                <label htmlFor = "publisher">Publisher:</label>
                                <input 
                                    id = "publisher" 
                                    type = "text" 
                                    name = "publisher" 
                                    className = "book-form__input"
                                    value = {book.publisher}
                                    onChange = {(e) => editBook(e)} 
                                />
                            </div>

                            <div className = "book-form__field">
                                <label htmlFor = "release">Release date:</label>
                                <input 
                                    id = "release" 
                                    type = "date" 
                                    name = "release" 
                                    className = "book-form__input" 
                                    value = {book.release !== undefined ? String(book.release) : ""} 
                                    onChange = {(e) => editBook(e)} 
                                />
                            </div>
                        </div>
                            
                        <FileSelector
                            book = {book}
                            setBook = {setBook}
                            setLoading = {setFuckingLoading}
                        />
                    </div>

                    <div className="book-form__field">
                        <label>Book tags:</label>
                        <DropdownMenu 
                            options = {tags} 
                            includedTags = {includedTags}
                            setIncludedTags = {setIncludedTags}
                        />
                    </div>

                    <div className = "book-form__buttons">
                        <button 
                            type = "submit" 
                            className = "book-form__button book-form__button--save"
                        >
                            Save
                        </button>
                        <button 
                            type = "button" 
                            className = "book-form__button book-form__button--cancel" 
                            onClick = {() => navigate('/')}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}