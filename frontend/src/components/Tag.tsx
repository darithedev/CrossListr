type TagProps = {
    tags: string[];
}

const Tag = ({ tags }: TagProps) => {

    return (
        <div className="tag-container">
            {tags.map((tag, index) => (
                <span key={index} className="tag">
                    {tag}
                </span>
            ))}
        </div>
    )
}

export default Tag;