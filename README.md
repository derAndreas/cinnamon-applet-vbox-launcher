Vbox Launcher applet
====================

Simple Cinnamon applet to launch Virtualbox virtual machines directly from the panel.

Orginal Applet by [andreadec](https://github.com/andreadec/cinnamon-applet-vbox-launcher)

Forked to add 
 - headless option, to run VMs in Headless mode
 - set an icon for the status of the VM (running, stopped)
 - if VM is running, a click on the VM will shutdown the VM via acpipoweroff


Installation
------------

- Make sure Virtualbox is installed
- Copy the folder `vboxlauncher@derAndreas` to `~/.local/share/cinnamon/applets/`
- Enable the applet in "Cinnamon Settings"


Usage
-----

The list of virtual machines is updated every time Cinnamon starts. 
You can choose if update it again every time the applet is clicked or to manually update  clicking on "Update list". The options menu is reachable right-clicking the applet.


Test
----
Tested on Linux Mint 14 with Cinnamon 1.6.7
