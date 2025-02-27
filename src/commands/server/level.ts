import CommandInt from "../../interfaces/CommandInt";
import LevelModel from "../../database/models/LevelModel";
import { MessageEmbed } from "discord.js";
import { beccaErrorHandler } from "../../utils/beccaErrorHandler";

const level: CommandInt = {
  name: "level",
  description:
    "Gets the user's current level. Optionally pass a **user** mention to get the record for another user.",
  parameters: ["`<?user>`: the user to fetch the data for."],
  category: "server",
  run: async (message) => {
    try {
      const {
        author,
        Becca,
        channel,
        commandArguments,
        guild,
        mentions,
      } = message;

      if (!guild) {
        await message.react(message.Becca.no);
        return;
      }

      // Set the author id as the default user id.
      let user_id = author.id;

      // Get the next argument as the user mention string.
      let userToStr = commandArguments.shift();

      // Get the first user mention.
      const userTo = mentions.users.first();

      // Check if has an user mention.
      if (userToStr && userTo) {
        // Remove the `<@!` and `>` from the mention to get the id.
        userToStr = userToStr.replace(/[<@!>]/gi, "");

        if (userToStr !== userTo.id) {
          await message.reply(
            `I am so sorry, but ${userToStr} is not a valid user.`
          );
          await message.react(message.Becca.no);
          return;
        }

        user_id = userTo.id;
      }

      // Get the server info from the database.
      const server = await LevelModel.findOne({
        serverID: guild.id,
      });

      // Check if the server info does not exist.
      if (!server) {
        await message.reply(
          "I am so sorry, but I have no record of that server."
        );
        await message.react(message.Becca.no);
        return;
      }

      // get the user ID from the server
      const user = server.users.find((u) => u.userID === user_id);

      // Check if no user
      if (!user) {
        await message.reply(
          `I am so sorry, but I have no record of <@!${user_id}>. Please encourage them to interact more!`
        );
        await message.react(message.Becca.no);
        return;
      }

      // Create a new empty embed.
      const levelEmbed = new MessageEmbed();

      // Add the light purple color.
      levelEmbed.setColor(Becca.color);

      // Add the title.
      levelEmbed.setTitle(`${user.userName}'s ranking`);

      // Add the description.
      levelEmbed.setDescription(
        `Here is the record I have for you in \`${guild.name}!\``
      );

      // Add the user experience.
      levelEmbed.addField("Experience points", user.points, true);

      // Add the user level.
      levelEmbed.addField("Level", user.level, true);

      // Add the time they were last seen
      levelEmbed.addField(
        "Last Seen",
        `I last saw them on ${new Date(user.lastSeen).toLocaleDateString()}`
      );

      // Send the embed to the current channel.
      await channel.send(levelEmbed);
      await message.react(message.Becca.yes);
    } catch (error) {
      await beccaErrorHandler(
        error,
        message.guild?.name || "undefined",
        "level command",
        message.Becca.debugHook,
        message
      );
    }
  },
};

export default level;
