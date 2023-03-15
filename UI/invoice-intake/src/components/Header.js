import React from "react"

export default function Header() {
    return (
        <header className="header">
            <img 
                src="demo.png" 
                className="header--image"
            />
            <h2 className="header--title">Invoice Intake</h2>
            <h4 className="header--project">Upload all your bill details related to the claim for faster processing! </h4>
        </header>
    )
}