# About
`ork-champions` is a simple character initiative manager for the [Champions/HERO System](https://www.herogames.com/)
table top role playing game.

No server-side scripting or storage is required, as all character and state data is maintained client-side via IndexedDB.

# Installation

Use my installation at [champions.howansky.org](https://champions.howansky.org/) or simply host these files somewhere and
hit them with a reasonably modern browser.

# Features

* Supports multiple campaigns.
* Supports player and non-player characters.
* Allows easy addition/editing/deletion of characters.
* Characters can be easily added to and removed from the current combat.
* Automatically determines turn order.
* Tracks the current player and current segment.

# Docs

## Character Library

The left side of the screen contains the character library, grouped by campaign. Click the campaign name header to toggle
an accordion which contains the characters in that campaign. Click the `New` button on the toolbar to add a new character.
Click the PC/NPC icon to the right of a character's name to edit or delete the character.

## Combat Table

The right side of the screen contains the combat table, which shows the characters active in the current combat. To add a
character to (or remove a character from) the combat table, click the checkbox to the left of their name in the character
library. Once all participating characters are added, click the `Start` button on the toolbar to start tracking combat
rounds. A yellow box will highlight the current segment for the current character's turn. Click `Next` to advance to the
next character's turn or click directly on a segment to advance to that point. Remove all characters from the combat table
and reset the current segment by clicking the `Clear` button on the toolbar.
