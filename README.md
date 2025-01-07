# About

`ork-champions` is a simple character initiative manager for the [Champions/HERO System](https://www.herogames.com/) table top role playing game.

No server-side scripting or storage is required, as all character and state data is maintained client-side via IndexedDB.

# Installation

Use the [GitHub Pages installation](https://alexhowansky.github.io/ork-champions/) or simply host these files somewhere
and hit `public/index.html` with a reasonably modern browser.

# Features

* Supports multiple campaigns.
* Supports player and non-player characters.
* Allows easy addition/editing/deletion of characters.
* Characters can be easily added to and removed from the current combat.
* Automatically determines turn order.
* Tracks the current player and current segment.
* Tracks the END/STUN/BODY for NPCs.
* Tracks flash status for NPCs.
* Automatically performs post-12 recoveries for NPCs.
* Supports character import from HERO Designer hdc files.

# Docs

## Characters

Click the `New Character` button to manually create a new character. To import a single character from [HERO Designer](https://www.herogames.com/store/product/1-hero-designer/), click the `Import` button and upload the `*.hdc` file. To import all characters from a backup of another instance of this application, click the `Import` button and upload the `*.json` file.

### Campaigns

Campaigns are mananaged automatically, based on the created and imported characters. Click the `Campaigns` button to see the existing campaigns. Click the campaign name header to toggle an accordion which contains the characters in that campaign. Click the character's name to edit the character. Click the checkbox to add the character to the current combat.

## Combat Table

The main application page contains the combat table, which shows the characters active in the current combat. To add a character to (or remove a character from) the combat table, click the checkbox to the left of their name in the character library. Once all participating characters are added, click the `Start` button on the toolbar to start tracking combat rounds. A yellow box will highlight the current segment for the current character's turn. Click `Next` to advance to the next character's turn or click directly on a segment to advance to that point. Remove all characters from the combat table and reset the current segment by clicking the `Clear` button on the toolbar.
