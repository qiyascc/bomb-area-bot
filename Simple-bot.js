const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('');

let gameData = {
  bombButtons: [],
  blackHeartButtons: [],
  currentPlayerIndex: 0,
};

bot.start((ctx) => {
  if (ctx.chat.type === 'private') {
    ctx.reply('Merhaba');
  }
});

bot.command('oyun', (ctx) => {
  if (ctx.chat.type !== 'private') {
    if (gameData.starterId) {
      ctx.reply('Bir oyun zaten devam ediyor. Lütfen önce onu sonlandırın.');
    } else {
      gameData = {
        starterId: ctx.from.id,
        players: [ctx.from.id], // oyunu başlatan kişi ilk sırada
        bombButtons: [],
        blackHeartButtons: [],
        currentPlayerIndex: 0,
      };
      ctx.reply(
        'Katılın',
        Markup.inlineKeyboard([
          Markup.button.callback('Katıl', 'join'),
          Markup.button.callback('Durdur', 'stop'),
        ])
      );
    }
  } else {
    ctx.reply('Bu komutu bir grup içinde kullanmalısınız.');
  }
});

bot.command('cancel', (ctx) => {
  if (gameData.starterId === ctx.from.id) {
    gameData = {
      bombButtons: [],
      blackHeartButtons: [],
      currentPlayerIndex: 0,
    };
    ctx.reply('Oyun durduruldu.');
  } else {
    ctx.reply('Sadece oyunu başlatan kişi oyunu durdurabilir.');
  }
});

bot.action('join', async (ctx) => {
  try {
    if (ctx.from.id === gameData.starterId) {
      await ctx.answerCbQuery('Sen zaten oyundasın. Bu buton başkaları için.');
    } else {
      gameData.players.push(ctx.from.id);
      await ctx.deleteMessage();

      let buttons = [];
      for (let i = 0; i < 6; i++) {
        let row = [];
        for (let j = 0; j < 6; j++) {
          let index = i * 6 + j;
          row.push(Markup.button.callback('❤️', 'btn' + index));
        }
        buttons.push(row);
      }
      for (let i = 0; i < 5; i++) {
        let randomIndex = Math.floor(Math.random() * 36);
        gameData.bombButtons.push('btn' + randomIndex);
      }
      ctx.reply(
        'Oyun başladı!',
        Markup.inlineKeyboard(buttons)
      );
    }
  } catch (err) {
    console.log(err);
  }
});

bot.action('stop', async (ctx) => {
  try {
    if (ctx.from.id === gameData.starterId) {
      await ctx.deleteMessage();
      gameData = {
        bombButtons: [],
        blackHeartButtons: [],
        currentPlayerIndex: 0,
      };
    } else {
      await ctx.answerCbQuery('Sen bu oyunu durduramazsın.');
    }
  } catch (err) {
    console.log(err);
  }
});

bot.action(/btn(\d+)/, async (ctx) => {
  try {
    if (!gameData.players || gameData.players.length === 0) {
      await ctx.answerCbQuery('Oyun başlamadı.');
    } else if (ctx.from.id !== gameData.players[gameData.currentPlayerIndex]) {
      await ctx.answerCbQuery('Şimdi sıra diğerinde.');
    } else {
      let index = parseInt(ctx.match[1]);
      gameData.blackHeartButtons.push('btn' + index);
      let buttons = [];
      for (let i = 0; i < 6; i++) {
        let row = [];
        for (let j = 0; j < 6; j++) {
          let currentIndex = i * 6 + j;
          let buttonText = '❤️';
          if (gameData.bombButtons.includes('btn' + currentIndex) && ctx.callbackQuery.data === 'btn' + currentIndex) {
            buttonText = '💣';
          } else if (gameData.blackHeartButtons.includes('btn' + currentIndex)) {
            buttonText = '🖤';
          }
          row.push(Markup.button.callback(buttonText, 'btn' + currentIndex));
        }
        buttons.push(row);
      }

      if (gameData.bombButtons.includes(ctx.callbackQuery.data)) {
        // Reveal all bomb locations when a bomb is clicked
        for (let i = 0; i < buttons.length; i++) {
          for (let j = 0; j < buttons[i].length; j++) {
            if (gameData.bombButtons.includes('btn' + (i * 6 + j))) {
              buttons[i][j] = Markup.button.callback('💣', 'btn' + (i * 6 + j));
            }
          }
        }

        await ctx.editMessageText(
          `Bomb! Kaybettin ${ctx.from.first_name}`,
          Markup.inlineKeyboard(buttons)
        );
        gameData = {
          bombButtons: [],
          blackHeartButtons: [],
          currentPlayerIndex: 0,
        };
      } else {
        await ctx.editMessageText(
          'Oyun devam ediyor!',
          Markup.inlineKeyboard(buttons)
        );
        gameData.currentPlayerIndex = (gameData.currentPlayerIndex + 1) % gameData.players.length;
      }
    }
  } catch (err) {
    console.log(err);
  }
});

bot.launch();
          
