// Cyclius UTC Scheduler — Steam-safe Options user interface (no CCSE dependency)
// ID must be "cyclius utc scheduler" in info.txt

Game.registerMod('cyclius utc scheduler', {
    init: function () {
        const mod_self = this;
        const mod_id_string = 'cyclius utc scheduler';
        const mod_display_name = 'Cyclius UTC Scheduler';

        // =========================
        // Persistent settings
        // =========================
        this.settings = {
            move_to_diamond: false
        };

        // =========================
        // Options user interface
        // =========================
        function build_settings_section() {
            const menu_root = l('menu');
            if (!menu_root || !menu_root.childNodes || !menu_root.childNodes.length) return;
            if (Game.onMenu !== 'prefs') return;

            // Remove any previous section to avoid duplicates on re-open
            const old = l('CycliusUTCSettings');
            if (old && old.parentNode) old.parentNode.removeChild(old);

            const section = document.createElement('div');
            section.id = 'CycliusUTCSettings';
            section.className = 'subsection';

            const title = document.createElement('div');
            title.className = 'title';
            title.innerHTML = mod_display_name;

            const listing = document.createElement('div');
            listing.className = 'listing';

            // Toggle button
            const toggle_button = document.createElement('a');
            toggle_button.id = 'Cyclius_MoveToDiamond_Button';
            toggle_button.classList.add('smallFancyButton', 'option', 'prefButton');
            if (!mod_self.settings.move_to_diamond) toggle_button.classList.add('off');
            toggle_button.innerHTML = mod_self.settings.move_to_diamond ? '[Use Diamond]' : '[Avoid Diamond]';
            toggle_button.onclick = function () {
                mod_self.settings.move_to_diamond = !mod_self.settings.move_to_diamond;
                toggle_button.innerHTML = mod_self.settings.move_to_diamond ? '[Use Diamond]' : '[Avoid Diamond]';
                toggle_button.classList.toggle('off', !mod_self.settings.move_to_diamond);
                Game.UpdateMenu(); // re-render text below
            };

            const label = document.createElement('label');
            const avoid_diamond_list = [
                '00:00–04:00 Ruby',
                '04:00–12:00 Jade',
                '12:00–18:00 Ruby',
                '18:00–24:00 Unslot'
            ];

            const use_diamond_list = [
                '00:00–01:12 Diamond',
                '01:12–04:00 Ruby',
                '04:00–09:15 Jade',
                '09:15–10:20 Diamond',
                '10:20–12:00 Jade',
                '12:00–13:12 Diamond',
                '13:12–18:00 Ruby',
                '18:00–19:30 Diamond',
                '19:30–21:00 Unslot',
                '21:00–22:30 Diamond',
                '22:30–24:00 Unslot'
            ];

            label.innerHTML =
                'Move to Diamond mode —<br>' +
                (mod_self.settings.move_to_diamond
                    ? use_diamond_list.join('; <br>')
                    : avoid_diamond_list.join('; <br>'));

            listing.appendChild(toggle_button);
            listing.appendChild(label);

            section.appendChild(title);
            section.appendChild(listing);

            // Insert near top (after a couple of default sections if present)
            menu_root.insertBefore(section, menu_root.childNodes[3] || null);
        }

        // Wrap Game.UpdateMenu to inject our section when Preferences is opened
        const original_update_menu = Game.UpdateMenu;
        Game.UpdateMenu = function () {
            original_update_menu();
            build_settings_section();
        };

        // =========================
        // Pantheon helpers
        // =========================

        // Ensure the Temple Pantheon minigame is initialized once per session.
        function pantheon_ready() {
            if (Game && Game.Objects && Game.Objects.Temple && Game.Objects.Temple.minigame) return true;
            if (Game && Game.Objects && Game.Objects.Temple && !pantheon_ready._warned) {
                pantheon_ready._warned = true;
                Game.Notify('Cyclius UTC Scheduler', 'Open the Temple once to initialize the Pantheon this session.', [8, 0], 6);
            }
            return false;
        }

        // Return the draggable Cyclius object,search by name, with a fallback to the known index used by most builds.
        function get_cyclius_object(pantheon) {
            for (let i = 0; i < pantheon.godsById.length; i++) {
                const god_object = pantheon.godsById[i];
                if (god_object && god_object.name === 'Cyclius') return god_object;
            }
            // Fallback to common index if localization changed the name
            return pantheon.godsById[3];
        }

        // Perform a slotting
        function slot_god_object_into_slot(god_object, slot_index) {
            const pantheon = Game.Objects.Temple.minigame;
            if (!pantheon || !god_object) return false;
            if (pantheon.dragging) return false;

            if (slot_index === god_object.slot) return true;

            // Handle unslot
            if (slot_index === -1) {
                pantheon.dragGod(god_object);
                pantheon.hoverSlot(-1);
                pantheon.dropGod();
                return true;
            }

            // Check available swaps
            if (mod_self.settings.move_to_diamond) {
                // In Move to diamond mode, only slot-in when all swaps (3) are available, unslot otherwise
                if (pantheon.swaps < 3) {
                    pantheon.dragGod(god_object);
                    pantheon.hoverSlot(-1);
                    pantheon.dropGod();
                    return true;
                }
            }
            else {
                // In Avoid diamond mode, only slot in when at least 1 swap is available, unslot otherwise
                if (pantheon.swaps < 1) {
                    pantheon.dragGod(god_object);
                    pantheon.hoverSlot(-1);
                    pantheon.dropGod();
                    return true;
                }
            }

            // Perform slot-in
            pantheon.dragGod(god_object);
            pantheon.hoverSlot(slot_index);
            pantheon.dropGod();
            return true;
        }

        // =========================
        // Coordinated Universal Time (UTC) schedule
        // =========================
        // [Avoid Diamond] (default):00:00-04:00 Ruby; -12:00 Jade; -18:00 Ruby; -24:00 unslot
        //   00:00–03:59 -> Ruby (1)
        //   04:00–11:59 -> Jade (2)
        //   12:00–17:59 -> Ruby (1)
        //   18:00–23:59 -> Unslot (null)
        //
        // [Use Diamond] (move_to_diamond):
        //   00:00–01:11 -> Diamond (0)
        //   01:12–03:59 -> Ruby (1)
        //   04:00–09:14 -> Jade (2)
        //   09:15–10:19 -> Diamond (0)
        //   10:20–11:59 -> Jade (2)
        //   12:00–13:11 -> Diamon (0)
        //   13:12–17:59 -> Ruby (1)
        //   18:00–19:29 -> Diamond (0)
        //   19:30–20:59 -> Unslot (null)
        //   21:00–22:29 -> Diamond (0)
        //   22:30–23:59 -> Unslot (null)
        function compute_target_for_utc_minutes(utc_minutes_integer, move_to_diamond_boolean) {
            if (!move_to_diamond_boolean) {
                if (utc_minutes_integer < 4 * 60) return 1;                 // Ruby
                if (utc_minutes_integer < 12 * 60) return 2;                // Jade
                if (utc_minutes_integer < 18 * 60) return 1;                // Ruby
                return -1;                                                // Unslot
            }

            // Use Diamond
            if (utc_minutes_integer < 1 * 60 + 12) return 0;              // Diamond
            if (utc_minutes_integer < 4 * 60) return 1;                   // Ruby
            if (utc_minutes_integer < 9 * 60 + 15) return 2;              // Jade
            if (utc_minutes_integer < 10 * 60 + 20) return 0;             // Diamond
            if (utc_minutes_integer < 12 * 60) return 2;                  // Jade
            if (utc_minutes_integer < 13 * 60 + 12) return 0;             // Diamond
            if (utc_minutes_integer < 18 * 60) return 1;                  // Ruby
            if (utc_minutes_integer < 19 * 60 + 30) return 0;             // Diamond
            if (utc_minutes_integer < 21 * 60) return -1;               // Unslot
            if (utc_minutes_integer < 22 * 60 + 30) return 0;             // Diamond
            return -1;                                                  // Unslot
        }


        // =========================
        // Scheduler tick
        // =========================
        let previous_target = null;
        function scheduler_tick() {
            if (!pantheon_ready()) return;

            const pantheon = Game.Objects.Temple.minigame;

            const now = new Date();
            const utc_minutes_integer = now.getUTCHours() * 60 + now.getUTCMinutes();

            const target_slot = compute_target_for_utc_minutes(utc_minutes_integer, mod_self.settings.move_to_diamond);

            // Only act when the target slot is different from previous target
            if (previous_target === null || previous_target === null) {
                previous_target = target_slot;
            } else if (target_slot === previous_target) {
                return;
            }
            const cyclius_object = get_cyclius_object(pantheon);
            slot_god_object_into_slot(cyclius_object, target_slot);
            pantheon.compute();
            Game.recalculateGains = 1;
        }

        // Run every five seconds; initial run after one second
        this._interval_handle = setInterval(scheduler_tick, 5000);
        setTimeout(scheduler_tick, 1000);

        Game.Notify(mod_display_name, 'Loaded. Open Options → Preferences to see the toggle.', [8, 0], 3);
    },

    save: function () {
        try {
            return JSON.stringify(this.settings);
        } catch (error_object) {
            return '';
        }
    },

    load: function (json_string) {
        try {
            if (!json_string) return;
            const parsed_object = JSON.parse(json_string);
            if (parsed_object && typeof parsed_object.move_to_diamond === 'boolean') {
                this.settings.move_to_diamond = parsed_object.move_to_diamond;
            }
        } catch (error_object) { }
    },

    kill: function () {
        if (this._interval_handle) clearInterval(this._interval_handle);
    }
});
