// Public GitHub data supplies membership; the hand-edited file supplies overrides.
const cacheKey = 'thxrul-public-repositories-v1', maxAge = 15 * 60 * 1000;
const symbols = { JavaScript:'JS', TypeScript:'TS', Python:'Py', Java:'Jv', Go:'Go', Rust:'Rs', HTML:'<>', CSS:'#', Shell:'$_', C:'C', 'C++':'C+' };
function valid(repos) {
    return Array.isArray(repos) && repos.every(repo => typeof repo.name === 'string' &&
        /^https:\/\/github\.com\/thxrul\/[^/]+$/i.test(repo.html_url) && !repo.private &&
        (repo.description == null || typeof repo.description === 'string') && (repo.language == null || typeof repo.language === 'string'));
}
export async function publicProjects(manual) {
    let cache;
    try { const saved = JSON.parse(localStorage.getItem(cacheKey)); if (saved && valid(saved.repos)) cache = saved; } catch {}
    let repos = cache?.repos;
    if (!cache || Date.now() - cache.at > maxAge) {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const result = [];
            for (let page = 1; ; page++) {
                const response = await fetch(`https://api.github.com/users/thxrul/repos?per_page=100&sort=updated&direction=desc&page=${page}`, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
                if (!response.ok) throw Error('GitHub unavailable');
                const batch = await response.json(); if (!valid(batch)) throw Error('Invalid repository response');
                result.push(...batch.map(({name,html_url,description,language,archived,fork}) => ({name,html_url,description,language,archived,fork})));
                if (batch.length < 100) break;
            }
            repos = result;
            try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), repos })); } catch {}
        } catch { /* Keep the last successful response, or the checked-in projects. */ }
        finally { clearTimeout(timeout); }
    }
    if (!repos?.length) return manual;
    const overrides = new Map(manual.map(project => [project.id.toLowerCase(), project]));
    return repos.map(repo => {
        const saved = overrides.get(repo.name.toLowerCase());
        return saved || { id: repo.name, name: repo.name, url: repo.html_url, language: repo.language || (repo.fork ? 'Fork' : 'Repository'), symbol: symbols[repo.language] || '</>', description: repo.description || 'A public repository on my GitHub.', ...(repo.archived ? {status:'Archived'} : {}) };
    });
}
