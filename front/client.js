storage = window.localStorage;

loadPositions();

interact('.draggable')
	.draggable({
		autoScroll: true,

		onmove: function (event) {
		var target = event.target,
				x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
				y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

		target.style.webkitTransform =
		target.style.transform =
			'translate(' + x + 'px, ' + y + 'px)';

		target.setAttribute('data-x', x);
		target.setAttribute('data-y', y);
		storePositions();
	}
	})
 .resizable({
		edges: { left: true, right: true, bottom: true, top: true },

		restrictSize: {
			min: { width: 100, height: 100 },
		}
	})
 .on('resizemove', function (event) {
		var target = event.target,
				x = (parseFloat(target.getAttribute('data-x')) || 0),
				y = (parseFloat(target.getAttribute('data-y')) || 0);

		target.style.width  = event.rect.width + 'px';
		target.style.height = event.rect.height + 'px';

		x += event.deltaRect.left;
		y += event.deltaRect.top;

		target.style.webkitTransform = target.style.transform =
				'translate(' + x + 'px,' + y + 'px)';

		target.setAttribute('data-x', x);
		target.setAttribute('data-y', y);
		storePositions();
	});

function onResize( element, callback ){
  var elementHeight = element.clientHeight,
      elementWidth = element.clientWidth;
  setInterval(function(){
      if( element.clientHeight !== elementHeight || element.clientWidth !== elementWidth ){
        elementHeight = element.clientHeight;
        elementWidth = element.clientWidth;
        callback();
      }
  }, 300);
}

onResize($("#minimap")[0], drawMap);

var colors = null;
$.getJSON("blockcolors.json", function(data) {
	colors = data;
});

function loadPositions() {
	$(".draggable").each(function(index) {
		var target = $(this);
		var got = storage.getItem("pos_" + $(this).attr("id"));
		if(got == null) return;
		var array = got.split(",");
		var x = array[0];
		var y = array[1];
		var width = array[2];
		var height = array[3];

		target[0].style.width  = width + 'px';
		target[0].style.height = height + 'px';

		target.attr("data-x", x);
		target.attr("data-y", y);

		target[0].style.webkitTransform = target[0].style.transform =
				'translate(' + x + 'px,' + y + 'px)';
	});
}

function storePositions() {
	$(".draggable").each(function(index) {
		var target = $(this);
		var width = target[0].clientWidth;
		var height = target[0].clientHeight;
		var x = (parseFloat(target.attr("data-x")) || 0);
		var y = (parseFloat(target.attr("data-y")) || 0);
		storage.setItem("pos_" + $(this).attr("id"), [x, y, width, height]);
	});
}

function base64ToArrayBuffer(base64) {
    var binary_string =  window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

function isAutoscroll(q) {
	return (q.prop('scrollHeight') - q.innerHeight()) === q.scrollTop();
}

function registerInput(q, fn) {
	q.on('keydown', function (e) {
		if(e.which === 13) {
			fn($(this).val());

			$(this).val("");
		}
	});
}

function log(message) {
	var a = (message + "\n").replace(/\n/g, "<br />").replaceColorCodes();
	var auto = isAutoscroll($("#terminal-output"));
	$("#terminal-output").append(a);
	if(auto) $("#terminal-output").animate({scrollTop: $("#terminal-output").prop("scrollHeight")}, 100);
}

function chat(message) {
	var a = (message + "\n").replace(/\n/g, "<br />").replaceColorCodes();
	var auto = isAutoscroll($("#messages"));
	$("#messages").append(a);
	if(auto) $("#messages").animate({scrollTop: $("#messages").prop("scrollHeight")}, 100);
}

const pixelSize = 4;
const chunkSize = pixelSize * 16;
var chunks = {};

var entityId = 0;

function drawMap() {
	var entity = entities[entityId];
	if(entity == null) {
		pos = [0, 0, 0];
	} else {
		pos = entity.position;
	}
	var c = document.getElementById("minimap");
	c.width = $("#minimap")[0].clientWidth;
	c.height = $("#minimap")[0].clientHeight;
	var ctx = c.getContext("2d");
	ctx.clearRect(0, 0, c.width, c.height);
	var chunkPos = [pos[0] >> 4, pos[2] >> 4];
	var totalSize = [Math.floor(c.width / chunkSize), Math.floor(c.height / chunkSize)];
	for(var x in chunks) {
		for(var z in chunks[x]) {
			var chunk = chunks[x][z];
			var cx = chunkPos[0] - x + 10;
			var cz = chunkPos[1] - z + 10;

			for(var rx = 0; rx < 16; rx++) {
				for(var rz = 0; rz < 16; rz++) {
					var blockId = chunk[rx][rz];
					if(blockId == 0) continue;
					if(colors[blockId] == null) {
						ctx.fillStyle = "rgb(" + (blockId) + ", 0, 0)";
					} else {
						ctx.fillStyle = "rgb(" + colors[blockId] + ")";
					}
					ctx.fillRect(-rx * pixelSize + cx * chunkSize, -rz * pixelSize + cz * chunkSize, pixelSize, pixelSize);
				}
			}
		}
	}
}

drawMap();

log("Establishing websocket connection...");

entities = {}

var socket = new WebSocket("ws://127.0.0.1:1488/undrClient");

function sendPacket(name, packet) {
	var obj = {
		"action": "send_packet",
		"pk": name,
		"packet": packet
	};
	socket.send(JSON.stringify(obj));
}

function interactPacket(q) {
	sendPacket("interact", { "action": 1, "entityId": parseInt($(q).attr("data-id")) })
}

strategy = 0;

function open() {
	log("OK!");

	log("=================");
	log("undrClient v1.0.0");
	log("Type \"help\" to get list of avaliable commands");
	log("=================");

	registerInput($("#command"), function(msg) {
		log("! " + msg);
		if(msg == "s1") {
			strategy = 1;
			return;
		} else if(msg == "s0") {
			strategy = 0;
			return;
		}
		var obj = {
			"action": "command",
			"message": msg
		};

		socket.send(JSON.stringify(obj));
	});

	registerInput($("#message"), function(msg) {
		var obj = {
			"action": "chat",
			"message": msg
		};
		socket.send(JSON.stringify(obj));
	});

	if(window.location.hash) {
		var ip = "";
		var username = "TheGrey";
		var args = window.location.hash.substring(1).split("&");
		for(var arg in args) {
			var kv = args[arg].split("=");
			var k = kv[0];
			var v = kv[1];
			if(v == null) continue;

			if(k == "ip") {
				ip = v;
			} else if(k == "username") {
				username = v;
			}
		}

		if(ip != "") {
			var obj = {
				"action": "command",
				"message": "connect " + ip.replace(":", " ") + " " + username
			};
			socket.send(JSON.stringify(obj));
		}
	}
	last = -1;
	setInterval(function() {
		var entity = entities[entityId];
		if(entity == null) {
			log("no entity!");
			return;
			pos = [0, 0, 0];
		} else {
			pos = entity.position;
		}
		if(strategy == 0) {
			last *= -1;
			sendPacket("move", { "x": pos[0] + 0.3 * last, "y": pos[1], "z": pos[2]});
		} else if(strategy == 1) {
			for(var entity in entities) {
				var e = entities[entity];
				if(entity != entityId && e.type == "Player") {
					sendPacket("interact", { "action": 2, "entityId": entity });
				}
			}
			last *= -1;
			sendPacket("move", { "x": pos[0] + 0.3 * last, "y": pos[1], "z": pos[2]});

		}
	}, 300);
	
}


socket.onopen = function() {
	open();
};

socket.onclose = function(event) {
  if (event.wasClean) {
	log("Disconnected from MiNET.Client");
  } else {
	log("Lost connection to MiNET.Client!");
  }
  log("Reason: \"" + event.reason + "\", #" + event.code);
};


socket.onmessage = function(event) {
	var json = JSON.parse(event.data);
	
	if(json.pk == "PlayerList") {
		for (var i = 0; i < json.players.length; i++) {
			var player = json.players[i];

			if(json.type == 1) { // add
				var skin = player.skin;
				$("#player-list").append(`
					<tr data-uuid="` + player.uuid + `"">
						<td><image src="data:image/bmp;base64,` + skin + `"/></td>
						<td>` + player.username + `</td>
						<td>` + player.entityId + `</td>
					</tr>
					`);
			} else {
				$("#player-list").find("[data-uuid='" + player.uuid + "']").remove();
			}
		}
	} else if(json.pk == "McpeDisconnect") {
		log("Disconnected: " + json.message)
	} else if(json.pk == "McpeMovePlayer") {
		var entity = entities[json.runtimeEntityId];
		if(entity == null) return;

		entity.position = [json.x, json.y - 1.62, json.z];

	} else if(json.pk == "McpeText") {
		chat(json.message);
	} else if(json.pk == "CommandResponse") {
		log("< " + json.message);
	} else if(json.pk == "MapData") {
		var data = base64ToArrayBuffer(json.data);
		var x = json.x;
		var z = json.z;
		
		var chunk = [];
		for(var rx = 0; rx < 16; rx++) {
			chunk[rx] = [];
			for(var rz = 0; rz < 16; rz++) {
				chunk[rx][rz] = data[rz + (rx * 16)];
			}
		}
		if(chunks[x] == null) {
			chunks[x] = [];
		}
		chunks[x][z] = chunk;
		drawMap();
	} else if(json.pk == "McpeAddEntity" || json.pk == "McpeAddPlayer") {
		var customName = json.metadata._entries[4];
		if(customName != null) {
			customName = customName.Value;
		}
		entities[json.runtimeEntityId] = {
			id: json.runtimeEntityId,
			type: json.entityTypeName,
			position: [json.x, json.y, json.z]
		};
		$("#entity-list").append(`
			<tr data-id="` + json.entityIdSelf + `" onclick="interactPacket(this)">
				<td>` + json.entityTypeName + `</td>
				<td>` + json.runtimeEntityId + `</td>
				<td>` + $('<div>').append(customName.replace(/\n/g, "<br />").replaceColorCodes()).html() + `</td>
			</tr>
			`);
	} else if(json.pk == "McpeRemoveEntity") {
		delete entities[json.entityIdSelf];
		$("#entity-list").find("[data-id='" + json.entityIdSelf + "']").remove();
	} else if(json.pk == "McpeMoveEntity") {
		var entity = entities[json.runtimeEntityId];
		if(entity == null) return;
		entity.position = [json.position.X, json.position.Y - 1.62, json.position.Z];
	} else if(json.pk == "McpeTransfer") {
		var ip = json.serverAddress + ":" + json.port;
		var username = "TheGrey";
		var args = window.location.hash.substring(1).split("&");
		var str = "#";
		for(var arg in args) {
			var kv = args[arg].split("=");
			var k = kv[0];
			var v = kv[1];
			if(v == null) continue;

			if(k == "username") {
				username = v;
				str += "username=" + v + "&";
			}
		}
		str += "ip=" + ip;
		window.location.hash = str;

		location.reload();
	} else if(json.pk == "McpeContainerSetSlot") {
		if(json.windowId == 0) {
			$("#slots").find("[data-slot=" + json.slot + "]").attr("src", "mc-icons/" + json.item.Id + ".png");
		}
	} else if(json.pk == "McpeStartGame") {
		entityId = json.runtimeEntityId;
		entities[entityId] = {
			id: entityId,
			type: "Player",
			position: [json.x, json.y, json.z]
		};
	} else {
		console.log(json);
	}
};
