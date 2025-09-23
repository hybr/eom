export function render() {
    const tpl = document.getElementById('home-template')
    return tpl.content.cloneNode(true)
}