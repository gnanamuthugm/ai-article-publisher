export function parseMarkdown(content: string): string {
  return content
    // Convert headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-gray-900 mb-4 mt-6">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-gray-900 mb-4 mt-6">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-gray-900 mb-6 mt-8">$1</h1>')
    // Convert bold
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold">$1</strong>')
    // Convert italic
    .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
    // Convert code blocks
    .replace(/```([^`]+)```/gim, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><code class="text-sm">$1</code></pre>')
    // Convert inline code
    .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-2 py-1 rounded text-sm">$1</code>')
    // Convert links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Convert line breaks
    .replace(/\n\n/gim, '</p><p class="mb-4">')
    // Wrap in paragraphs
    .replace(/^(.+)$/gim, '<p class="mb-4">$1</p>')
    // Clean up
    .replace(/<p class="mb-4"><\/p>/gim, '')
    .replace(/<p class="mb-4">(h[1-6]|<pre|<ul|<ol|<blockquote)/gim, '$1')
    .replace(/<\/(h[1-6]|pre|ul|ol|blockquote)><p class="mb-4">/gim, '</$1>')
    // Convert lists
    .replace(/^\* (.+)$/gim, '<li class="ml-6 mb-2">$1</li>')
    .replace(/(<li[\s\S]*<\/li>)/g, '<ul class="list-disc mb-4">$1</ul>')
    // Convert numbered lists
    .replace(/^\d+\. (.+)$/gim, '<li class="ml-6 mb-2">$1</li>')
}
