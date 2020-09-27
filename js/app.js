$(function() {

    const config = {

        // Used to indicate which characters are active in the battle table.
        checkedIcon: 'fas fa-check-square text-success',
        uncheckedIcon: 'fas fa-square text-dark',

        // Used to indicate the difference between a PC and an NPC.
        pcIcon: 'fas fa-user text-primary',
        npcIcon: 'fas fa-robot text-secondary',

        // Used to indicate which segments a character acts on.
        activeIcon: 'fas fa-check text-success',
        inactiveIcon: 'fas fa-times text-danger',

        // Used to indicate the currently open accordion segment.
        accordionClosedIcon: 'fas fa-chevron-right',
        accordionOpenIcon: 'fas fa-chevron-down',

    }

    // Open/close the selected accordion segment.
    $('#campaignList').on('click', 'div.card>div.card-header', function() {
        champions.setCurrentCampaign($(this).data('id'))
            .then(toggleAccordion('campaignList', $(this).data('id')));
    });

    // Add a character to the combat table.
    $('#campaignList').on('click', 'div.card>div.collapse>ul>li>i.fas[data-id]', function() {
        champions.toggleCharacterActive($(this).data('id'))
            .then(active => $(this).removeClass().addClass(getActiveIcon(active)))
            .then(renderCombatTable());
    });

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
    $('body').on('click', 'i.fas[data-cid]', function() {
        champions.getCharacter($(this).data('cid'))
            .then(character => {
                $('#editCharacterCampaign').val(character.campaign);
                $('#editCharacterName').val(character.name);
                $('#editCharacterSpeed').val(character.speed);
                $('#editCharacterDex').val(character.dex);
                $(character.pc ? '#editCharacterPc' : '#editCharacterNpc').prop('checked', true);
                $('#editCharacterFormDeleteButton').data('id', character.id);
                $('#editCharacterModal').modal('show');
            });
    });

    // Deactivate all characters, removing them from the combat table and unchecking them in the campaign list.
    $('#clearButton').click(function() {
        champions.deactivateAllCharacters(
            function(character) {
                $('#campaignList>div.card>div.collapse>ul>li>i.fas[data-id="' + character.id + '"]')
                    .removeClass()
                    .addClass(getActiveIcon(0));
                $('#combatTable>tr[data-id="' + character.id + '"]').remove();
            }
        )
            .then(enableBattleTableControls(false));
    });

    $('#startButton').click(function() {
        champions.reset().then(findNext());
    });

    $('#nextButton').click(function() {
        findNext();
    });

    // Clicking directly on a combat table cell sets the current turn to that point.
    $('#combatTable').on('click', 'tr>td[data-segment]', function() {
        champions.setCurrentCharacter($(this).data('character')).then(
            champions.setCurrentSegment($(this).data('segment')).then(
                renderCombatTableHighlight($(this).data('character'), $(this).data('segment'))
            )
        );
    });

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
                renderCampaignList();
                $('#combatTable>tr[data-id="' + characterId + '"]').remove();
            });
    });

    $('#editCharacterForm').submit(function(event) {
        event.preventDefault();
        champions.updateCharacter(
            $('#editCharacterFormDeleteButton').data('id'),
            {
                campaign: $('#editCharacterCampaign').val(),
                name: $('#editCharacterName').val(),
                speed: parseInt($('#editCharacterSpeed').val()),
                dex: parseInt($('#editCharacterDex').val()),
                pc: $('#editCharacterPc:checked').val() ? 1 : 0
            }
        ).then(() => {
            $('#editCharacterModal').modal('hide');
            $('#editCharacterForm').trigger('reset');
            renderCampaignList();
            renderCombatTable();
        })
    });

    $('#newCharacterFormCancelButton').click(function(event) {
        $('#newCharacterModal').modal('hide');
        $('#newCharacterForm').trigger('reset');
    });

    $('#newCharacterForm').submit(function(event) {
        event.preventDefault();
        champions.putCharacter({
            campaign: $('#newCharacterCampaign').val(),
            name: $('#newCharacterName').val(),
            speed: $('#newCharacterSpeed').val(),
            dex: $('#newCharacterDex').val(),
            active: 0,
            pc: $('#newCharacterPc:checked').val() ? 1 : 0
        }).then(() => {
            $('#newCharacterModal').modal('hide');
            $('#newCharacterForm').trigger('reset');
            renderCampaignList();
        })
    });

    // We'll disable the battle table controls when there are no characters active.
    function enableBattleTableControls(enable = true) {
        $('.battleTableControls>button').prop('disabled', !enable);
    }

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

    function getActiveIcon(active) {
        return active ? config.checkedIcon : config.uncheckedIcon;
    }

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

    function renderCombatTable() {
        $('#combatTable>tr').remove();
        return champions.getActiveCharacters()
            .then(characters => {
                characters.forEach((character, index) => {
                    var row = template('combatTableRowHeaderTemplate', {
                        characterId: character.id,
                        name: character.name,
                        speed: character.speed,
                        dex: character.dex,
                        pcIcon: character.pc ? config.pcIcon : config.npcIcon,
                        pcTitle: character.pc ? 'PC' : 'NPC'
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

    function renderCombatTableHighlight(currentCharacter, currentSegment) {
        $('#combatTable>tr>td').removeClass('bg-warning');
        if (currentSegment > 0) {
            $($('#combatTable>tr:nth-child(' + (currentCharacter + 1) + ')')
                .find('td')[currentSegment + 2])
                .addClass('bg-warning');
        }
    }

    function speedActsInSegment(speed, segment) {
        return getSegmentsForSpeed(speed).includes(segment);
    }

    function template(id, vars = {}) {
        var text = $('#' + id).html();
        Object.entries(vars).forEach(([key, value]) => text = text.replace(new RegExp(`{{${key}}}`, 'g'), `${value}`));
        return text;
    }

    function toggleAccordion(accordionId, cardHeaderId) {
        $('#' + accordionId + '>div.card>div.card-header[data-id]').each(function() {
            var icon = $(this).find('i.fas');
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

    renderCampaignList()
    renderCombatTable();

});
