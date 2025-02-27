import { Client, WebhookClient } from "discord.js";
import connectDatabase from "./database/main";
import BeccaInt from "./interfaces/BeccaInt";
import extendsClientToBeccaInt from "./utils/extendsClientToBeccaInt";
import { getCommands, getListeners } from "./utils/readDirectory";
import dotenv from "dotenv";
dotenv.config();

// Events
import onReady from "./events/onReady";
import onGuildCreate from "./events/onGuildCreate";
import onGuildDelete from "./events/onGuildDelete";
import onGuildMemberAdd from "./events/onGuildMemberAdd";
import onMessage from "./events/onMessage";
import onMessageDelete from "./events/onMessageDelete";
import onMessageUpdate from "./events/onMessageUpdate";
import onGuildMemberRemove from "./events/onGuildMemberRemove";
import { endpoint } from "./utils/server/httpEndpoint";
import { beccaLogger } from "./utils/beccaLogger";

export async function botConnect(): Promise<void> {
  // Get the node_env from the environment.
  const node_env = process.env.NODE_ENV || "development";

  // Debug channel hook (Send messages here when is debugging).
  let debugChannelHook: WebhookClient | null = null;

  // Check if `WH_ID` and `WH_TOKEN` are configured in the environment.
  if (process.env.WH_ID && process.env.WH_TOKEN) {
    debugChannelHook = new WebhookClient(
      process.env.WH_ID,
      process.env.WH_TOKEN
    );
  }

  // Create a new Discord bot object.
  const Becca: BeccaInt = extendsClientToBeccaInt(
    new Client({
      partials: ["USER"],
      shards: "auto",
    })
  );

  // Add the debug hook
  if (debugChannelHook) {
    Becca.debugHook = debugChannelHook;
  }

  // Add Becca's version to the client.
  Becca.version = process.env.npm_package_version || "version not found";

  // Add Becca's Emotes
  Becca.yes = process.env.BECCA_YES || "✅";
  Becca.no = process.env.BECCA_NO || "❌";
  Becca.think = process.env.BECCA_THINK || "🤔";
  Becca.love = process.env.BECCA_LOVE || "💜";

  // Load the commands.
  Becca.commands = await getCommands();

  // Load the listeners.
  Becca.customListeners = await getListeners();

  // Shard logging
  Becca.on("shardReady", (shard) => {
    if (Becca.debugHook) {
      Becca.debugHook.send(`Shard ${shard} is ready!`);
    }
    beccaLogger.log("debug", `Shard ${shard} is ready!`);
  });

  Becca.on("shardError", (err, shard) => {
    if (Becca.debugHook) {
      Becca.debugHook.send(`Shard ${shard} has crashed. Please see the longs.`);
    }
    beccaLogger.log(
      "error",
      JSON.stringify({ errorMessage: err.message, errorStack: err.stack })
    );
  });

  // When Becca connects...
  Becca.on("ready", async () => {
    await endpoint();
    await onReady(Becca, debugChannelHook, node_env);
  });

  // On guild create event.
  Becca.on(
    "guildCreate",
    async (guild) => await onGuildCreate(guild, debugChannelHook, Becca)
  );

  // On guild delete event.
  Becca.on(
    "guildDelete",
    async (guild) => await onGuildDelete(guild, debugChannelHook, Becca)
  );

  // When a member joins to a server.
  Becca.on(
    "guildMemberAdd",
    async (member) => await onGuildMemberAdd(member, Becca)
  );

  // When a member left a server.
  Becca.on(
    "guildMemberRemove",
    async (member) => await onGuildMemberRemove(member, Becca)
  );

  // When an user sends a message to a channel.
  Becca.on("message", async (message) => await onMessage(message, Becca));

  // When an user deletes a message from a channel.
  Becca.on(
    "messageDelete",
    async (message) => await onMessageDelete(message, Becca)
  );

  // When an user edits a message.
  Becca.on(
    "messageUpdate",
    async (oldMessage, newMessage) =>
      await onMessageUpdate(oldMessage, newMessage, Becca)
  );

  // kill process on disconnect - this ties in to
  // server monitoring through http endpoint.
  Becca.on("disconnect", () => {
    process.exit(1);
  });

  // Connect Becca
  await Becca.login(process.env.DISCORD_TOKEN);

  //set custom status
  await Becca.user?.setActivity("for people who need my help~!", {
    type: "WATCHING",
  });

  // Connect to the MongoDB database.
  await connectDatabase(debugChannelHook, Becca, node_env);
}
