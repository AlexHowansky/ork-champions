$(function() {

    const config = {

        // Used to indicate which characters are active in the battle table.
        checkedIcon: 'fa-solid fa-check-square text-success',
        uncheckedIcon: 'fa-solid fa-square text-dark',

        // Used to indicate the difference between a PC and an NPC.
        pcIcon: 'fa-solid fa-user text-primary',
        npcIcon: 'fa-solid fa-robot text-secondary',

        // Used to indicate which segments a character acts on.
        activeIcon: 'fa-solid fa-check text-success',
        inactiveIcon: 'fa-solid fa-xmark text-danger',

        // Used to indicate the currently open accordion segment.
        accordionClosedIcon: 'fa-solid fa-chevron-right',
        accordionOpenIcon: 'fa-solid fa-chevron-down',

        // Action/status icons used in the battle table.
        knockedOutIcon: '<i class="fa-solid fa-face-dizzy text-danger" title="Knocked Out"></i>',
        recoveryIcon: '<i class="fa-solid fa-square-plus text-danger" title="Take A Recovery" data-recovery="{{characterId}}"></i>',

    }

    // Open/close the selected accordion segment.
    $('#campaignList').on('click', 'div.card>div.card-header', function() {
        champions.setCurrentCampaign($(this).data('id'))
            .then(toggleAccordion('campaignList', $(this).data('id')));
    });

    // Add a character to the combat table.
    $('#campaignList').on('click', 'div.card>div.collapse>ul>li>i.fa-solid[data-id]', function() {
        champions.toggleCharacterActive($(this).data('id'))
            .then(active => $(this).removeClass().addClass(getActiveIcon(active)))
            .then(recover($(this).data('id'), true))
            .then(renderCombatTable());
    });

    // The native file upload widget is hidden, so we'll proxy this click through to it.
    $('#importButton').click(function() {
        $('#importFile').click();
    });

    // Import characters.
    $('#importFile').change(function() {
        var file = $('#importFile').prop('files')[0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function(event) {
            if (file.name.endsWith('.hdc')) {
                var parser = new DOMParser();
                var xml = parser.parseFromString(event.target.result, 'text/xml');
                var body = 10 + getXml(xml, 'BODY');
                var con = 10 + getXml(xml, 'CON');
                var dex = 10 + getXml(xml, 'DEX');
                var str = 10 + getXml(xml, 'STR');
                var end = 2 * con + getXml(xml, 'END');
                var speed = Math.floor(1 + (dex / 10) + getXml(xml, 'SPD'));
                var stun = body + Math.round(str / 2) + Math.round(con / 2) + getXml(xml, 'STUN');
                var rec = Math.round(str / 5) + Math.round(con / 5) + getXml(xml, 'REC');
                var reflexes = 0;
                for (const talent of xml.getElementsByTagName('TALENT')) {
                    if (talent.getAttribute('XMLID') === 'LIGHTNING_REFLEXES_ALL') {
                        reflexes = Number(talent.getAttribute('LEVELS'));
                        break;
                    }
                }
                champions.putCharacter({
                    body: body,
                    campaign: getXml(xml, 'CHARACTER_INFO', 'CAMPAIGN_NAME'),
                    dex: dex,
                    end: end,
                    maxBody: body,
                    maxEnd: end,
                    maxRec: rec,
                    maxStun: stun,
                    name: getXml(xml, 'CHARACTER_INFO', 'CHARACTER_NAME'),
                    reflexes: reflexes,
                    speed: speed,
                    stun: stun,
                });
            } else {
                JSON.parse(event.target.result).forEach(character => champions.putCharacter(character));
            }
            refresh(true);
        }
    });

    // Export characters.
    $('#exportButton').click(function() {
        champions.getCharacters().then(characters => {
            characters.forEach(character => delete character.id);
            let a = document.createElement('a');
            a.setAttribute('href', 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(characters)));
            a.setAttribute('download', 'championsCharacters_' + (new Date()).toLocaleDateString('en-US').split('/').join('-') + '.json');
            a.click();
        });
    });

    // Open the edit character modal.
    $('body').on('click', '*[data-cid]', function() {
        champions.getCharacter($(this).data('cid'))
            .then(character => {
                $('#editCharacterCampaign').val(character.campaign);
                $('#editCharacterName').val(character.name);
                $('#editCharacterSpeed').val(character.speed);
                $('#editCharacterDex').val(character.dex);
                $('#editCharacterReflexes').val(character.reflexes);
                $(character.pc ? '#editCharacterPc' : '#editCharacterNpc').prop('checked', true);
                $('#editCharacterMaxEnd').val(character.maxEnd);
                $('#editCharacterMaxStun').val(character.maxStun);
                $('#editCharacterMaxBody').val(character.maxBody);
                $('#editCharacterMaxRec').val(character.maxRec);
                $('#editCharacterEnd').val(character.end);
                $('#editCharacterStun').val(character.stun);
                $('#editCharacterBody').val(character.body);
                if (character.pc) {
                    $('#editCharacterStats').hide();
                } else {
                    $('#editCharacterStats').show();
                }
                $('#editCharacterFormDeleteButton').data('id', character.id);
                $('#editCharacterModal').modal('show');
            });
    });

    // Take a recovery.
    $('body').on('click', '*[data-recovery]', function() {
        champions.getCharacter($(this).data('recovery'))
            .then(character => {
                if (!character.pc) {
                    character.end = Math.min(character.end + character.maxRec, character.maxEnd);
                    champions.updateCharacter($(this).data('recovery'), {end: character.end});
                    renderCombatTable();
                }
            })
    });

    // Reset END, STUN, BODY to max.
    $('#editCharacterRestButton').click(function() {
        recover($('#editCharacterFormDeleteButton').data('id'), true);
    });

    // Take a recovery.
    $('#editCharacterRecoverButton').click(function() {
        recover($('#editCharacterFormDeleteButton').data('id'), false);
    });

    // Deactivate all characters, removing them from the combat table and unchecking them in the campaign list.
    $('#clearButton').click(function() {
        champions.deactivateAllCharacters(
            function(character) {
                $('#campaignList>div.card>div.collapse>ul>li>i.fa-solid[data-id="' + character.id + '"]')
                    .removeClass()
                    .addClass(getActiveIcon(0));
                $('#combatTable>tr[data-id="' + character.id + '"]').remove();
            }
        )
            .then(enableBattleTableControls(false));
    });

    // Start combat on segment 12.
    $('#startButton').click(function() {
        champions.reset().then(findNext());
    });

    // Advance to the next player's phase.
    $('#nextButton').click(function() {
        findNext();
    });

    // Clicking directly on a combat table cell sets the current phase to that point.
    $('#combatTable').on('click', 'tr>td[data-segment]', function() {
        champions.setCurrentCharacter($(this).data('character')).then(
            champions.setCurrentSegment($(this).data('segment')).then(
                renderCombatTableHighlight($(this).data('character'), $(this).data('segment'))
            )
        );
    });

    // Cancel a character edit without saving changes.
    $('#editCharacterFormCancelButton').click(function(event) {
        $('#editCharacterModal').modal('hide');
        $('#editCharacterForm').trigger('reset');
    });

    // Delete a character via the character edit modal.
    $('#editCharacterFormDeleteButton').click(function(event) {
        const characterId = $('#editCharacterFormDeleteButton').data('id');
        champions.deleteCharacter(characterId)
            .then(() => {
                $('#editCharacterModal').modal('hide');
                $('#editCharacterForm').trigger('reset');
                refresh();
            });
    });

    // Duplicate a character via the character edit modal.
    $('#editCharacterFormDuplicateButton').click(function(event) {
        champions.getCharacter($('#editCharacterFormDeleteButton').data('id'))
            .then(character => {
                champions.getDuplicateName(character.name)
                    .then(duplicateName => {
                        duplicateCharacter = Object.assign({}, character);
                        duplicateCharacter.name = duplicateName;
                        delete duplicateCharacter.id;
                        champions.putCharacter(duplicateCharacter);
                    })
                    .then(() => {
                        $('#editCharacterModal').modal('hide');
                        $('#editCharacterForm').trigger('reset');
                        refresh();
                    })
            });
    });

    // Save character edits.
    $('#editCharacterForm').submit(function(event) {
        event.preventDefault();
        champions.updateCharacter(
            $('#editCharacterFormDeleteButton').data('id'),
            {
                campaign: $('#editCharacterCampaign').val(),
                name: $('#editCharacterName').val(),
                speed: parseInt($('#editCharacterSpeed').val()),
                dex: parseInt($('#editCharacterDex').val()),
                reflexes: parseInt($('#editCharacterReflexes').val()),
                pc: $('#editCharacterPc:checked').val() ? 1 : 0,
                maxEnd: parseInt($('#editCharacterMaxEnd').val()),
                maxStun: parseInt($('#editCharacterMaxStun').val()),
                maxBody: parseInt($('#editCharacterMaxBody').val()),
                maxRec: parseInt($('#editCharacterMaxRec').val()),
                end: parseInt($('#editCharacterEnd').val()),
                stun: parseInt($('#editCharacterStun').val()),
                body: parseInt($('#editCharacterBody').val())
            }
        ).then(() => {
            $('#editCharacterModal').modal('hide');
            $('#editCharacterForm').trigger('reset');
            refresh(true);
        })
    });

    // If we have a PC, hide the extra stats. (PCs track their own.)
    $('#editCharacterPc').click(function(event) {
        $('#editCharacterStats').hide();
    });

    // If we have an NPC, show the extra stats.
    $('#editCharacterNpc').click(function(event) {
        $('#editCharacterStats').show();
    });

    // Cancel character create.
    $('#newCharacterFormCancelButton').click(function(event) {
        $('#newCharacterModal').modal('hide');
        $('#newCharacterForm').trigger('reset');
    });

    // Save a new character.
    $('#newCharacterForm').submit(function(event) {
        event.preventDefault();
        champions.putCharacter({
            campaign: $('#newCharacterCampaign').val(),
            name: $('#newCharacterName').val(),
            speed: parseInt($('#newCharacterSpeed').val()),
            dex: parseInt($('#newCharacterDex').val()),
            reflexes: parseInt($('#newCharacterReflexes').val()),
            pc: $('#newCharacterPc:checked').val() ? 1 : 0
        }).then(() => {
            $('#newCharacterModal').modal('hide');
            $('#newCharacterForm').trigger('reset');
            refresh(true);
        })
    });

    // Dismiss the post 12 recovery modal.
    $('#post12OkButton').click(function(event) {
        renderCombatTable();
    });

    // We'll disable the battle table controls when there are no characters active.
    function enableBattleTableControls(enable = true) {
        $('.battleTableControls>button').prop('disabled', !enable);
    }

    // Determine the next player's phase.
    function findNext() {
        champions.getCurrentCharacter().then(currentCharacter => {
            champions.getCurrentSegment().then(currentSegment => {
                champions.getActiveCharacters().then(characters => {
                    if (currentSegment === null || currentCharacter === null) {
                        currentSegment = 12;
                        currentCharacter = -1;
                    }
                    do {
                        if (++currentCharacter >= characters.length) {
                            currentCharacter = 0;
                            if (++currentSegment > 12) {
                                post12();
                                currentSegment = 1;
                                $('#post12').modal('show');
                            }
                        }
                    } while (speedActsInSegment(characters[currentCharacter].speed, currentSegment) === false);
                    champions.setCurrentCharacter(currentCharacter).then(
                        champions.setCurrentSegment(currentSegment).then(
                            renderCombatTableHighlight(currentCharacter, currentSegment)
                        )
                    );
                });
            });
        });
    }

    // Get the icon for a particular active status.
    function getActiveIcon(active) {
        return active ? config.checkedIcon : config.uncheckedIcon;
    }

    // Get the active segments for a particular speed.
    function getSegmentsForSpeed(speed) {
        return {
            1: [7],
            2: [6, 12],
            3: [4, 8, 12],
            4: [3, 6, 9, 12],
            5: [3, 5, 8, 10, 12],
            6: [2, 4, 6, 8, 10, 12],
            7: [2, 4, 6, 7, 9, 11, 12],
            8: [2, 3, 5, 6, 8, 9, 11, 12],
            9: [2, 3, 4, 6, 7, 8, 10, 11, 12],
            10: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
            11: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            12: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        }[speed];
    }

    function getXml(xml, tag, attr = 'LEVELS') {
        var value = xml.getElementsByTagName(tag)[0].getAttribute(attr);
        return isNaN(value) ? value : Number(value);
    }

    // Take a recovery for all active and conscious characters.
    function post12() {
        champions.getActiveCharacters()
            .then(characters => {
                characters.forEach(character => {
                    if (!character.pc && character.stun > 0) {
                        recover(character.id);
                    }
                })
            });
    }

    // Take a recovery or rest.
    function recover(cid, rest = false) {
        champions.getCharacter(cid)
            .then(character => {
                if (rest) {
                    character.end = character.maxEnd;
                    character.stun = character.maxStun;
                    character.body = character.maxBody;
                } else {
                    character.end = Math.min(character.end + character.maxRec, character.maxEnd);
                    character.stun = Math.min(character.stun + character.maxRec, character.maxStun);
                }
                champions.updateCharacter(
                    cid,
                    {
                        end: character.end,
                        stun: character.stun,
                        body: character.body
                    }
                );
                $('#editCharacterEnd').val(character.end);
                $('#editCharacterStun').val(character.stun);
                $('#editCharacterBody').val(character.body);
            });
    }

    function refresh(migrate = false) {
        if (migrate === true) {
            champions.migrate();
        }
        renderCampaignList()
        renderCombatTable();
    }

    // Render the campaign list.
    function renderCampaignList() {
        return champions.getCharacters()
            .then(characters => {
                var html = '';
                var campaignId = 0;
                var campaignName;
                for (var i = 0; i < characters.length; i++) {
                    if (campaignName !== characters[i].campaign) {
                        campaignName = characters[i].campaign;
                        if (campaignId) {
                            html += template('campaignListFooterTemplate');
                        }
                        html += template('campaignListHeaderTemplate', {
                            campaignId: ++campaignId,
                            campaignName: campaignName,
                            accordionIcon: config.accordionClosedIcon
                        });
                    }
                    html += template('campaignListCharacterTemplate', {
                        characterId: characters[i].id,
                        name: characters[i].name,
                        checkIcon: characters[i].active ? config.checkedIcon : config.uncheckedIcon,
                        pcIcon: characters[i].pc ? config.pcIcon : config.npcIcon,
                        pcTitle: characters[i].pc ? 'PC' : 'NPC'
                    });
                }
                html += template('campaignListFooterTemplate');
                $('#campaignList>div.card').remove();
                $('#campaignList').append(html);
            })
            .then(() => champions.getCurrentCampaign())
            .then(campaign => toggleAccordion('campaignList', campaign));
    }

    // Render the combat table.
    function renderCombatTable() {
        $('#combatTable>tr').remove();
        return champions.getActiveCharacters()
            .then(characters => {
                characters.forEach((character, index) => {
                    var row = template('combatTableRowHeaderTemplate', {
                        characterId: character.id,
                        name: character.name,
                        speed: character.speed,
                        end: xOfY(character, 'end', 'maxEnd'),
                        stun: xOfY(character, 'stun', 'maxStun'),
                        body: xOfY(character, 'body', 'maxBody'),
                        dex: character.dex,
                        initiative: character.dex + character.reflexes,
                        pcIcon: character.pc ? config.pcIcon : config.npcIcon,
                        pcTitle: character.pc ? 'PC' : 'NPC',
                        knockedOutIcon: character.pc ? '' : (character.stun > 0 ? '' : config.knockedOutIcon),
                        recoveryIcon: character.pc ? '' : (character.end < character.maxEnd ? config.recoveryIcon : '')
                    });
                    for (var segment = 1; segment <= 12; segment++) {
                        if (speedActsInSegment(character.speed, segment)) {
                            row += template('combatTableCellActiveTemplate', {
                                characterIndex: index,
                                segment: segment,
                                icon: config.activeIcon
                            });
                        } else {
                            row += template('combatTableCellInactiveTemplate', {
                                icon: config.inactiveIcon
                            });
                        }
                    }
                    row += template('combatTableRowFooterTemplate');
                    $('#combatTable').append(row);
                });
                enableBattleTableControls(characters.length > 0);
            })
            .then(() => {
                champions.getCurrentCharacter().then(currentCharacter => {
                    champions.getCurrentSegment().then(currentSegment => {
                        renderCombatTableHighlight(currentCharacter, currentSegment)
                    })
                })
            })
    }

    // Highlight the current segment.
    function renderCombatTableHighlight(currentCharacter, currentSegment) {
        $('#combatTable>tr>td').removeClass('bg-warning');
        if (currentSegment > 0) {
            $($('#combatTable>tr:nth-child(' + (currentCharacter + 1) + ')')
                .find('td')[currentSegment + 6])
                .addClass('bg-warning');
        }
    }

    // Does a speed act in a particular segment?
    function speedActsInSegment(speed, segment) {
        return getSegmentsForSpeed(speed).includes(segment);
    }

    // Render a template.
    function template(id, vars = {}) {
        var text = $('#' + id).html();
        Object.entries(vars).forEach(([key, value]) => text = text.replace(new RegExp(`{{${key}}}`, 'g'), `${value}`));
        Object.entries(vars).forEach(([key, value]) => text = text.replace(new RegExp(`{{${key}}}`, 'g'), `${value}`));
        return text;
    }

    // Toggle an accordion.
    function toggleAccordion(accordionId, cardHeaderId) {
        $('#' + accordionId + '>div.card>div.card-header[data-id]').each(function() {
            var icon = $(this).find('i.fa-solid');
            var collapse = $(this).parent().find('div.collapse');
            if ($(this).data('id') === cardHeaderId && !collapse.hasClass('show')) {
                collapse.collapse('show');
                icon.removeClass().addClass(config.accordionOpenIcon);
            } else {
                collapse.collapse('hide');
                icon.removeClass().addClass(config.accordionClosedIcon);
            }
        });
    }

    function xOfY(character, x, y) {
        if (character.pc) {
            return '';
        }
        if (character[x] === character[y]) {
            return character[x];
        }
        return '<span class="text-info">' + character[x] + '</span> (' + character[y] + ')';
    }

    refresh(true);

});
