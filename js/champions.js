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

    function isCharacterActive(characterId) {
        return db.characters
            .get(characterId)
            .then(character => character.active);
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
        if (a.dex === b.dex) {
            if (a.speed === b.speed) {
                return sortByName(a, b);
            }
            return b.speed - a.speed;
        }
        return b.dex - a.dex;
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
        isCharacterActive: isCharacterActive,
        putCharacter: putCharacter,
        reset: reset,
        setCurrentCampaign: setCurrentCampaign,
        setCurrentCharacter: setCurrentCharacter,
        setCurrentSegment: setCurrentSegment,
        toggleCharacterActive: toggleCharacterActive,
        updateCharacter: updateCharacter,
    }

})();
