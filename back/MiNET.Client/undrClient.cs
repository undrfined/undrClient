using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using MiNET.Net;
using MiNET.Utils;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace MiNET.Client
{
	class undrClient
	{
		public undrClient()
		{
			var wssv = new WebSocketServer(1488);
			wssv.AddWebSocketService<undrClientService>("/undrClient");
			wssv.Start();
		}
	}

	public class undrClientService : WebSocketBehavior
	{
		public MiNetClient Client;

		public undrClientService()
		{
		}

		protected override void OnMessage(MessageEventArgs e)
		{
			try
			{
				var json = JObject.Parse(e.Data);
				if((string) json["action"] == "send_packet")
				{
					if (Client == null || !Client.HaveServer)
						return;
					var pk = (string) json["pk"];
					var packet = json["packet"];
					switch (pk)
					{
						case "interact":
							var interact = McpeInteract.CreateObject();
							interact.actionId = (byte) packet["action"];
							interact.targetRuntimeEntityId = (long) packet["entityId"];
							Client.SendPackage(interact);
							break;
						case "move":
							Client.CurrentLocation = new PlayerLocation((float)packet["x"], (float) packet["y"], (float) packet["z"]);
							Console.WriteLine("move to " + Client.CurrentLocation);
							Client.SendMcpeMovePlayer();
							break;
					}
				} else if ((string) json["action"] == "command")
				{
					var args = ((string)json["message"]).Split(' ');
					switch (args[0].ToLower())
					{
						case "chat":
							Client.SendChat(string.Join(" ", args.Skip(1)));
							break;

						case "disconnect":
							if(Client != null)
							{
								Client.SendDisconnectionNotification();
								CommandResponse("Disconnected");
							}
							else
							{
								CommandResponse("Not connected");
							}
							break;
						case "connect":
							IPAddress ip;
							if (args.Length <= 1)
							{
								ip = IPAddress.Loopback;
							}
							else
							{
								var addresses = Dns.GetHostEntry(args[1]).AddressList;
								if (addresses.Length > 0)
								{
									ip = addresses[0];
								}
								else if (IPAddress.TryParse(args[1], out ip))
								{
									CommandResponse("Bad ip: " + args[1]);
									return;
								}
							}

							short port;
							if (args.Length <= 2)
							{
								port = 19132;
							}
							else
							{
								if (!short.TryParse(args[2], out port))
								{
									CommandResponse("Bad port: " + args[2]);
									return;
								}
							}

							string username;
							if (args.Length <= 3)
							{
								username = "TheGrey";
							}
							else
							{
								username = args[3];
							}

							CommandResponse("Connecting to " + ip + ":" + port);
							var endpoint = new IPEndPoint(ip, port);
							Connect(endpoint, username);
							break;
						default:
							Send("Unknown command!");
							break;
					}
				} else if((string)json["action"] == "chat")
				{
					Client.SendChat((string) json["message"]);
				}
			} catch(Exception ex)
			{
				Console.WriteLine(ex);
			}
		}

		public void CommandResponse(string message)
		{
			var jo = new JObject();
			jo["pk"] = "CommandResponse";
			jo["message"] = message;
			Send(jo.ToString());
		}

		public void Connect(IPEndPoint endpoint, string username = "TheGrey")
		{
			var client = new MiNetClient(endpoint, username, new DedicatedThreadPool(new DedicatedThreadPoolSettings(Environment.ProcessorCount)));
			client.WS = this;
			client.StartClient();

			Task.Run(BotHelpers.DoWaitForSpawn(client))
				.ContinueWith(t => CommandResponse("Client spawned successfully"));

			client._serverEndpoint = endpoint;
			client.HaveServer = true;
			client.SendOpenConnectionRequest1();

			Client = client;
		}

		public new void Send(string message)
		{
			base.Send(message);
		}


		protected override void OnClose(CloseEventArgs e)
		{
			base.OnClose(e);
			Client?.SendDisconnectionNotification();
			Client?.StopClient();
			Client = null;
		}
		public void Send(Package message)
		{
			var jsonSerializerSettings = new JsonSerializerSettings
			{
				PreserveReferencesHandling = PreserveReferencesHandling.Arrays,

				Formatting = Formatting.Indented,
			};
			jsonSerializerSettings.Converters.Add(new NbtIntConverter());
			jsonSerializerSettings.Converters.Add(new NbtStringConverter());

			var jo = JObject.Parse(JsonConvert.SerializeObject(message, jsonSerializerSettings));
			jo["pk"] = message.GetType().Name;

			Send(jo.ToString());
		}
	}
}
