var champions = (function () {

    const db = new Dexie('Champions');

    db.version(1).stores({
        characters: '++id, &name, active',
        parameters: ''
    });

    // Sets all active characters to inactive and invokes the callback for each.
    function deactivateAllCharacters(callback = function() {}) {
        return db.characters
            .where('active')
            .aboveOrEqual(1)
            .modify(character => {
                callback(character);
                character.active = 0;
            })
            .then(reset());
    }

    function deleteCharacter(characterId) {
        return db.characters
            .delete(characterId);
    }

    function getActiveCharacters() {
        return db.characters
            .where('active')
            .equals(1)
            .toArray()
            .then(characters => characters.sort(sortByDex));
    }

    function getCharacter(character) {
        return db.characters
            .get(character);
    }

    function getCharacters() {
        return db.characters
            .toArray()
            .then(characters => characters.sort(sortByCampaign));
    }

    function getCurrentCampaign() {
        return db.parameters
            .get('currentCampaign');
    }

    function getCurrentCharacter() {
        return db.parameters
            .get('currentCharacter');
    }

    function getCurrentSegment() {
        return db.parameters
            .get('currentSegment');
    }

    function getDuplicateName(name) {
        var num = 0;
        var base = name.replace(/ \(\d+\)$/, '');
        var pattern = new RegExp('^' + base + ' \\((\\d+)\\)$');
        return getCharacters()
            .then(characters => {
                characters.forEach(character => {
                    var match = character.name.match(pattern);
                    if (match && match[1] > num) {
                        num = parseInt(match[1]);
                    }
                });
                return base + ' (' + ++num + ')';
            });
    }

    function isCharacterActive(characterId) {
        return db.characters
            .get(characterId)
            .then(character => character.active);
    }

    // If fields have been added to (or removed from) the character object since
    // our last update, we'll need to ensure that the existing records have (or
    // don't have) values for them.
    function migrate() {
        db.characters
            .toCollection()
            .modify(character => {
                const fields = {
                    active: 0,
                    body: 0,
                    campaign: 'n/a',
                    dex: 0,
                    end: 0,
                    flashed: 0,
                    id: 0,
                    maxBody: 0,
                    maxEnd: 0,
                    maxRec: 0,
                    maxStun: 0,
                    name: 'n/a',
                    pc: 0,
                    reflexes: 0,
                    speed: 0,
                    status: [],
                    stun: 0,
                    url: '',
                };
                for (const field in character) {
                    if (fields[field] === undefined) {
                        delete character[field];
                    }
                }
                for (const field in fields) {
                    character[field] = character[field] ?? fields[field];
                }
            });
    }

    function putCharacter(character) {
        return db.characters
            .put(character);
    }

    function reset() {
        return setCurrentSegment(null)
            .then(setCurrentCharacter(null));
    }

    function setCurrentCampaign(campaign) {
        return db.parameters
            .get('currentCampaign')
            .then(currentCampaign => db.parameters.put(currentCampaign === campaign ? 0 : campaign, 'currentCampaign'));
    }

    function setCurrentCharacter(character) {
        return db.parameters
            .put(character, 'currentCharacter');
    }

    function setCurrentSegment(segment) {
        return db.parameters
            .put(segment, 'currentSegment');
    }

    function sortByCampaign(a, b) {
        if (a.campaign < b.campaign) {
            return -1;
        }
        if (a.campaign > b.campaign) {
            return 1;
        }
        return sortByName(a, b);
    }

    function sortByDex(a, b) {
        if (a.dex + a.reflexes === b.dex + b.reflexes) {
            if (a.speed === b.speed) {
                if (a.pc === b.pc) {
                    return sortByName(a, b);
                }
                return b.pc - a.pc;
            }
            return b.speed - a.speed;
        }
        return (b.dex + b.reflexes) - (a.dex + a.reflexes);
    }

    function sortByName(a, b) {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    }

    function toggleCharacterActive(characterId)
    {
        return db.characters
            .where('id')
            .equals(characterId)
            .modify(character => character.active = 1 - character.active)
            .then(() => isCharacterActive(characterId));
    }

    function updateCharacter(characterId, character)
    {
        return db.characters
            .update(characterId, character);
    }

    return {
        deactivateAllCharacters: deactivateAllCharacters,
        deleteCharacter: deleteCharacter,
        getActiveCharacters: getActiveCharacters,
        getCharacter: getCharacter,
        getCharacters: getCharacters,
        getCurrentCampaign: getCurrentCampaign,
        getCurrentCharacter: getCurrentCharacter,
        getCurrentSegment: getCurrentSegment,
        getDuplicateName: getDuplicateName,
        isCharacterActive: isCharacterActive,
        migrate: migrate,
        putCharacter: putCharacter,
        reset: reset,
        setCurrentCampaign: setCurrentCampaign,
        setCurrentCharacter: setCurrentCharacter,
        setCurrentSegment: setCurrentSegment,
        toggleCharacterActive: toggleCharacterActive,
        updateCharacter: updateCharacter,
    }

})();
