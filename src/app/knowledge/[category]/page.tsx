export function generateStaticParams() {
  return [{ category: "general" }];
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold capitalize">
        {category.replace(/-/g, " ")}
      </h1>
    </div>
  );
}
