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

type ItemResponse = {
    id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
    images: { image_id: number; url: string; index: number }[];
}

// Likely move to /helper dir
const authHeaders = () => {
    const token = localStorage.getItem('token')
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
}

const ItemDetails = () => {

    return (
        <>
        </>
    )
}
export default ItemDetails;