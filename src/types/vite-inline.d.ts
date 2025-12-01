// Vite ?inline クエリの型定義
declare module "*.scss?inline" {
	const content: string;
	export default content;
}

declare module "*.css?inline" {
	const content: string;
	export default content;
}
