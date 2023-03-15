import React from "react"
import Header from "./components/Header"
import Footer from "./components/Footer"
import Form from "./components/Form"
/**
 * Challenge: 
 * - Create a Meme component.
 * - Inside the Meme component, render a styled form
 *   with our 2 inputs and the button.
 * - Don't worry about adding any functionality yet
 */
export default function App() {
    return (
        <div className="main">
            <Header />
            <Form />
            <Footer />
        </div>
    )
}
