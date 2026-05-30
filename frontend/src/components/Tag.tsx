type TagProps = {
    tag: string;
    category: 'status' | 'marketplace';
}

const Tag = ({ tag, category }: TagProps) => {

    return (
        <div className="tag-container">
            <span className={`${category}`}>
                {tag}
            </span>
        </div>
    )
}

export default Tag;