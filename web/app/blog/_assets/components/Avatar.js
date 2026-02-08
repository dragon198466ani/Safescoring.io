import Link from "next/link";
import Image from "next/image";

// This is the author avatar that appears in the article page and in <CardArticle /> component
const Avatar = ({ article }) => {
  if (!article?.author) {
    return (
      <span className="inline-flex items-center gap-2 text-base-content/60">
        <span className="w-7 h-7 rounded-full bg-base-300 flex items-center justify-center text-xs">?</span>
        <span>Anonymous</span>
      </span>
    );
  }

  // Brand author without avatar image (e.g., SafeScoring)
  if (!article.author.avatar) {
    return (
      <span className="inline-flex items-center gap-2 group" itemProp="author">
        <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {article.author.name.charAt(0)}
        </span>
        <span className="text-base-content/80">{article.author.name}</span>
      </span>
    );
  }

  return (
    <Link
      href={`/blog/author/${article.author.slug}`}
      title={`Posts by ${article.author.name}`}
      className="inline-flex items-center gap-2 group"
      rel="author"
    >
      <span itemProp="author">
        <Image
          src={article.author.avatar}
          alt=""
          className="w-7 h-7 rounded-full object-cover object-center"
          width={28}
          height={28}
        />
      </span>
      <span className="group-hover:underline">{article.author.name}</span>
    </Link>
  );
};

export default Avatar;
