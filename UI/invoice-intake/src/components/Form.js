import React from "react"

export default function Form() {
    const [formData, setFormData] = React.useState(
        {
            firstName: "", 
            lastName: "", 
            email: "", 
            claimNumber: "", 
            file: "",
        }
    )
    console.log(formData)
    
    function handleChange(event) {
        console.log(event)
        const {name, value, type, checked} = event.target
        setFormData(prevFormData => {
            return {
                ...prevFormData,
                [name]: type === "checkbox" ? checked : value
            }
        })
    }
    
    function handleSubmit() {
        
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="First Name"
                onChange={handleChange}
                name="firstName"
                value={formData.firstName}
            />
            <input
                type="text"
                placeholder="Last Name"
                onChange={handleChange}
                name="lastName"
                value={formData.lastName}
            />
            <input
                type="email"
                placeholder="Email"
                onChange={handleChange}
                name="email"
                value={formData.email}
            />
            <input
                type="text"
                placeholder="Claim Number"
                onChange={handleChange}
                name="claimNumber"
                value={formData.claimNumber}
            />
            <input type="file" 
            onChange={handleChange}
            name="attachedFile"
            value={formData.file}
             />
            <br />           
            <br />
           
            <button>Upload Invoice</button>
        </form>
    )
}
