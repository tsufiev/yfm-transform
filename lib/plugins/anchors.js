const slugify = require('slugify');
const {bold} = require('chalk');

const {headingInfo} = require('../utils');

function createLinkTokens(state, id, setId = false) {
    const open = new state.Token('link_open', 'a', 1);
    const text = new state.Token('text', '', 0);
    const close = new state.Token('link_close', 'a', -1);

    if (setId) {
        open.attrSet('id', id);
    }
    open.attrSet('href', '#' + id);
    open.attrSet('class', 'yfm-anchor');
    open.attrSet('aria-hidden', 'true');
    text.content = '';

    return [open, text, close];
}

const CUSTOM_ID_REGEXP = /{ ?#(\S+) ?}/g;
const getCustomIds = (content) => {
    const ids = [];

    content.replace(CUSTOM_ID_REGEXP, (match, customId) => {
        ids.push(customId);
    });

    return ids.length ? ids : null;
};
const removeCustomIds = (token) => {
    token.content = token.content.replace(CUSTOM_ID_REGEXP, '').trim();
    token.children.forEach((child) => {
        child.content = child.content.replace(CUSTOM_ID_REGEXP, '').trim();
    });
};

function anchors(md, {extractTitleOption, path, log}) {
    const plugin = (state) => {
        const ids = {};
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];
            const isHeading = token.type === 'heading_open';

            if (isHeading) {
                const {title, level} = headingInfo(tokens, i);
                const inlineToken = tokens[i + 1];
                let id = token.attrGet('id');
                let customIds;

                if (!title) {
                    log.warn(`Header without title${path ? ` in ${bold(path)}` : ''}`);
                }

                if (level < 2 && extractTitleOption) {
                    i += 3;
                    continue;
                }

                if (!id) {
                    customIds = getCustomIds(inlineToken.content);
                    if (customIds) {
                        id = customIds[0];
                        removeCustomIds(tokens[i + 1]);
                    } else {
                        id = slugify(title || '', {lower: true});
                    }

                    token.attrSet('id', id);
                }

                if (ids[id]) {
                    id = id + ids[id]++;
                    token.attrSet('id', id);
                } else {
                    ids[id] = 1;
                }

                const allAnchorIds = customIds ? customIds : [id];

                allAnchorIds.forEach((customId) => {
                    const setId = id !== customId;
                    const linkTokens = createLinkTokens(state, customId, setId);

                    inlineToken.children.unshift(...linkTokens);
                });

                i += 3;
                continue;
            }

            i++;
        }
    };

    try {
        md.core.ruler.before('links', 'anchors', plugin);
    } catch (e) {
        md.core.ruler.push('anchors', plugin);
    }
}

module.exports = anchors;
