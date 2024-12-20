<h2 align="center"> Personal Multi-purpose Discord Bot </h2>
<p align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1222403123050446939">Invite</a>
</p>

<h4 align="center">Technologies, services, and other resources used</h4>
<p align="center" style="text-align: center;">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/discordjs/discordjs-plain.svg" width=48 />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" width=48 />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" width=48 />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prisma/prisma-original.svg" width=48 />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dbeaver/dbeaver-original.svg" width=48 />
  <img src="https://skillicons.dev/icons?i=latex" />
</p>
<h4 align="center">Primarily aimed to streamline personal use cases of Discord; data fetching and organization, organizing social events, and managing work flow</h4>

---
## Available commands
- `/avatar` - sends the highest definition of a user's avatar available from Discord's CDN
  - *Optional: a user input*, your user is used by default
---
- `/dmc` - attach a channel reference for Starcraft II Weekly co-op mutators
  - Weekly posts an embed listing information of the current week's mutation set
  - Internally calls `/mutator`
---
- `/gex` - invokes a dialog that starts a gift exchange event
  - Unfulfilled interaction timeout is set to 24 hours
  - Built-in <em>weak</em> validation of randomized inputs
![showcase-gex](https://github.com/KXzeno/akathar/blob/master/assets/showcase-1.gif)
---
- `/mutator` - Posts an informational embed for Starcraft II co-op's current mutator set
  - Relies on [CTG's mutator data](https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/edit?gid=0#gid=0)
---
- `/reminder` - set a reminder for a specified time
  - On the duration's end, it will ping the user
  - If `/settimetable` is used, then every reminder henceforth will be sent to the designated channel
---
- `/settimetable` - attach a channel reference for where reminders will be posted
---
#### Hitlist
- Handle dmc's unique id detection more gracefully
- Add a fallback for reminders with no descriptions
<h5 align="center"> 
  <em>Contact <a href="mailto:kemesurient@gmail.com" target="_blank">me</a> if you wish to integrate a feature</em>
</h4>

