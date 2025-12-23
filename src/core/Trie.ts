class TrieNode {
    children: Map<string, TrieNode> = new Map();
    words: string[] = [];
}

export default class Trie {
    private root = new TrieNode();

    insert(word: string) {
        let node = this.root;
        for (const char of word.toLocaleLowerCase()) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.words.push(word);
    }

    search(prefix: string): string[] {
        let node = this.root;

        for (const char of prefix.toLocaleLowerCase()) {
            const next = node.children.get(char);
            if (!next) return [];
            node = next;
        }

        return this.collect(node);
    }

    private collect(node: TrieNode, results: string[] = []): string[] {
        results.push(...node.words);

        for (const child of node.children.values()) {
            this.collect(child, results);
        }

        return results;
    }
}
