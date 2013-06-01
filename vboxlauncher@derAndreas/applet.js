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
			
			let [res_all, out_all, err_all, status_all] = GLib.spawn_command_line_sync("vboxmanage list vms");
			let [res_run, out_run, err_run, status_run] = GLib.spawn_command_line_sync("vboxmanage list runningvms");
      let run_vms = {};
      // get the running VMs
      if(out_run.length != 0) {
        let machines = out_run.toString().split("\n");
        for(let i = 0; i < machines.length; i++) {
          let machine = machines[i];
          if(machine == "") {
            continue;
          }
          let info = machine.split('" {');
          let name = info[0].replace('"', '');
          let id = info[1].replace("}", '');
          run_vms[id] = true;
        }
      }
			
			if(out_all.length!=0) {
				let machines = out_all.toString().split("\n");
				for(let i=0; i<machines.length; i++) {
					let machine = machines[i];
					if(machine=="") continue;
					let info = machine.split('" {');
					
					let name = info[0].replace('"', '');
					let id = info[1].replace('}', '');
					
          let menuitem = new PopupMenu.PopupSubMenuMenuItem(name);
          if(id in run_vms) {
            let itemStop = new PopupMenu.PopupImageMenuItem('Stop VM With ACPI Shutdown', 'media-playback-start-symbolic');
            itemStop.connect('activate', Lang.bind(this, function() { this.stopVM(id); }));
            menuitem.menu.addMenuItem(itemStop);
          } else {
            let itemNormal = new PopupMenu.PopupImageMenuItem('Run Normal', 'media-record-symbolic');
            let itemHeadless = new PopupMenu.PopupImageMenuItem('Run Headless', 'media-record-symbolic');
            itemNormal.connect('activate', Lang.bind(this, function() { this.startVM(id); }));
            itemHeadless.connect('activate', Lang.bind(this, function() { this.startVMHeadless(id); }));
            menuitem.menu.addMenuItem(itemNormal);
            menuitem.menu.addMenuItem(itemHeadless);
          }

					this.menu.addMenuItem(menuitem);
				}
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
	}
};

function main(metadata, orientation) {
	let applet = new vBoxApplet(orientation);
	return applet;
}
