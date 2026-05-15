import { useState, useEffect } from 'react'
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios'

type Item = {
    id: string;
    item_images: string[];
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
};

const ItemDetails = () => {

    return (
        <>
        </>
    )
}
export default ItemDetails;