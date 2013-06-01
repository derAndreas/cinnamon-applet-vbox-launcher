const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Main = imports.ui.main;
const SettingsFile = GLib.build_filenamev([global.userdatadir, 'applets/vboxlauncher@derAndreas/settings.json']);

function vBoxMenu(launcher, orientation) {
  this._init(launcher, orientation);
}
vBoxMenu.prototype = {
  __proto__: PopupMenu.PopupMenu.prototype,
  _init: function(launcher, orientation) {
    this._launcher = launcher;
    PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);
    Main.uiGroup.add_actor(this.actor);
    this.actor.hide();
  }
}

function vBoxApplet(orientation) {
	this._init(orientation);
};

vBoxApplet.prototype = {
	__proto__: Applet.IconApplet.prototype,

  _init: function(orientation) {
    Applet.IconApplet.prototype._init.call(this, orientation);

    try {
      this.set_applet_icon_name("virtualbox");

      this.menuManager = new PopupMenu.PopupMenuManager(this);
      this.menu = new vBoxMenu(this, orientation);
      this.menuManager.addMenu(this.menu);

      this.loadSettings();
      this.updateMenu();
      this.buildContextMenu();
    }
    catch (e) {
      global.logError(e);
    }
	},
	
	updateMenu: function() {
		this.menu.removeAll();
		try {
			let menuitemVbox = new PopupMenu.PopupMenuItem("VirtualBox");
			menuitemVbox.connect('activate', Lang.bind(this, this.startVbox));

			this.menu.addMenuItem(menuitemVbox);
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			
      var status = this._getVMStatus();
      for(let i in status) {
        let machine = status[i];
        // build the menu
        let menuItem = new PopupMenu.PopupSubMenuMenuItem(machine['name']);

        if(machine.running === true) {
          let itemStop = new PopupMenu.PopupImageMenuItem('Stop VM with ACPI Shutdown', 'media-playback-start-symbolic');
          itemStop.connect('activate', Lang.bind(this, function() {this.stopVM(machine.id); }));
          menuItem.menu.addMenuItem(itemStop);
        } else {
          let itemRunNormal = new PopupMenu.PopupImageMenuItem('Run Normal', 'media-record-symbolic');
          let itemRunHeadless = new PopupMenu.PopupImageMenuItem('Run Headless', 'media-record-symbolic');

          itemRunNormal.connect('activate', Lang.bind(this, function() { this.startVM(machine.id); }));
          itemRunHeadless.connect('activate', Lang.bind(this, function() { this.startVMHeadless(machine.id); }));

          menuItem.menu.addMenuItem(itemRunNormal);
          menuItem.menu.addMenuItem(itemRunHeadless);
        }

        this.menu.addMenuItem(menuItem);
      }

		} catch(e) {
			this.menu.addMenuItem(new PopupMenu.PopupMenuItem("ERROR. Make sure Virtualbox is installed.", { reactive: false }));
		}
		
		if(!this.settings.autoUpdate) {
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			let menuitemUpdate = new PopupMenu.PopupMenuItem("Update list");
			menuitemUpdate.connect('activate', Lang.bind(this, this.updateMenu));
			this.menu.addMenuItem(menuitemUpdate);
		}
	},
	
	startVM: function(id) {
		Main.Util.spawnCommandLine("virtualbox --startvm " +  id);
	},
  startVMHeadless: function(id) {
    Main.Util.spawnCommandLine('VBoxHeadless --startvm ' + id);
  },
	
	startVbox: function() {
		Main.Util.spawnCommandLine("virtualbox");
	},

  stopVM: function(id) {
    Main.Util.spawnCommandLine("VBoxManage controlvm " + id + " acpipowerbutton")
  },

	on_applet_clicked: function(event) {
		if(this.settings.autoUpdate && !this.menu.isOpen) {
			this.updateMenu();
		}
		this.menu.toggle();
	},
	
	buildContextMenu: function() {
		this.switchAutoUpdate = new PopupMenu.PopupSwitchMenuItem("Auto update (slow)");
		this.switchAutoUpdate.setToggleState(this.settings.autoUpdate);
		this.switchAutoUpdate.connect('toggled', Lang.bind(this, this.onSwitchAutoUpdateClick));
		this._applet_context_menu.addMenuItem(this.switchAutoUpdate);
	},
	
	onSwitchAutoUpdateClick: function(item) {
		this.settings.autoUpdate = item.state;
		if(!item.state) {
			this.updateMenu(); // Needed to make update button reappear if setting switched to off
		}
		this.saveSettings();
	},
	
	loadSettings: function() {
		try {
			this.settings = JSON.parse(Cinnamon.get_file_contents_utf8_sync(SettingsFile));
		} catch(e) {
			global.logError(e);
			global.logError("Settings file not found. Using default values.");
			this.settings = JSON.parse("{\"autoUpdate\":false}");
		}
	},
	
	saveSettings: function() {
		let file = Gio.file_new_for_path(SettingsFile);
		let outputFile = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
		let out = Gio.BufferedOutputStream.new_sized(outputFile, 1024);
		Cinnamon.write_string_to_stream(out, JSON.stringify(this.settings));
		out.close(null);
	},

  _getVMStatus: function() {
    // collect all vms then check which are running
    var all = this._getVMCommandParser('vboxmanage list vms');

    for(let machine in this._getVMCommandParser('vboxmanage list runningvms')) {
      if(all.hasOwnProperty(machine)) {
        all[machine].running = true;
      }
    }

    return all;
  },

  _getVMCommandParser: function(command) {
    let result = {};
    let [response, output, error, status] = GLib.spawn_command_line_sync(command);

    if(output.length != 0) {
      let machines = output.toString().split("\n");
      let mlen = machines.length;

      for(let i = 0; i < mlen; i++) {
        let machine = machines[i].match(/"([^"]+)"\s+\{([^\}]+)\}/i);
        if(machine) {
          result[machine[2]] = {name : machine[1], id : machine[2]};
        }
      }
    }

    return result;
  }
};

function main(metadata, orientation) {
	let applet = new vBoxApplet(orientation);
	return applet;
}
