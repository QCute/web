
/* 一 -> [78, 0] */
function encodeUnicode(string) {
    return string.split("").flatMap(e => e.charCodeAt(0))
}

/* [78, 0] -> 一 */
function decodeUnicode(array) {
    return unescape(array.map(e => e.toString(16).padStart(2, "0")).reduce((a, e, i) => i % 2 == 0 ? a + "\\u" + e : a + e, "").replace(/\\/g, '%'));
}

/* [78, 0] -> [228, 184, 128] */
function unicodeToUtf8(array) {
    return encodeUtf8(decodeUnicode(array));
}

/* 一 -> [228, 184, 128] */
function encodeUtf8(string) {
    return Array.from(string).map(e => {
        return e.charCodeAt(0) < 256 ? e.charCodeAt(0) : encodeURIComponent(e).split("%").filter(f => f !== "").map(g => parseInt(g, 16));
    });
}

/* [228, 184, 128] -> 一 */
function decodeUtf8(array) {
    return decodeURIComponent(array.map(e => "%" + parseInt(e).toString(16).padStart(2, "0")).join(""));
}

/* [228, 184, 128] -> [78, 0] */
function utf8ToUnicode(array) {
    return encodeUnicode(decodeUtf8(array));
}
