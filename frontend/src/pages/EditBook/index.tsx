import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DeleteMessage } from "../../components/DeleteMessage";
import { IBook } from "../../components/BookCard";
import { NavBar } from "../../components/NavBar";
import { blankBook } from "../NewBook";
import { api } from "../../database/api";

export function EditBook() 
{
    const [book, setBook] = useState<IBook>(blankBook);
    const [deleteMsg, setDeleteMsg] = useState(false);

    const { id } = useParams();

    const navigate = useNavigate();

    useEffect(() =>
    {
        api.get(`books/${id}`)
            .then((response) => {
                setBook(response.data[0]);
            })
            .catch((error) => {
                console.log(`Error retrieving book: ${error}`);
            });
    }, []);

    function editBook(event: React.ChangeEvent<HTMLInputElement>) 
    {
        const { name, value } = event.target;
        setBook({ ...book, [name]: value });
    }

    async function saveBook(event: React.FormEvent<HTMLFormElement>) 
    {
        event.preventDefault()

        try 
        {
            await api.put(`books/${id}`, book);
            navigate('/');
        } 
        catch (error) 
        {
            console.log(error);
        }
    }

    if (deleteMsg)
        return (
            <DeleteMessage id={book.id} title={book.title} abortDeletion={setDeleteMsg}/>
        )

    return (
        <>
            <NavBar />
            <div className="book-form">
                <form onSubmit={saveBook}>
                    <header>
                        <h1>Edit book</h1>
                        <button type="button" className="book-form__button book-form__button--delete" onClick={() => setDeleteMsg(true)}>Delete book</button>
                    </header>

                    <div className="book-form__field">
                        <label htmlFor="title">Title:</label>
                        <input type="text" name="title" id="title" value={book.title} onChange={(e) => editBook(e)} required />
                    </div>

                    <div className="book-form__field">
                        <label htmlFor="author">Author:</label>
                        <input type="text" name="author" id="author" value={book.author} onChange={(e) => editBook(e)} required />
                    </div>

                    <div className="book-form__field">
                        <label htmlFor="publisher">Publisher:</label>
                        <input type="text" name="publisher" id="publisher" value={book.publisher} onChange={(e) => editBook(e)} required />
                    </div>

                    <div className="book-form__field">
                        <label htmlFor="pages">Number of pages:</label>
                        <input type="number" name="pages" id="pages" value={book.pages} onChange={(e) => editBook(e)} required />
                    </div>

                    <div className="book-form__buttons">
                        <button type="submit" className="book-form__button book-form__button--save">Save</button>
                        <button type="button" className="book-form__button book-form__button--cancel" onClick={() => navigate('/')}>Cancel</button>
                    </div>
                </form>
            </div>
        </>
    )
}