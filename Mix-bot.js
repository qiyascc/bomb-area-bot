const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf('5506538841:AAE0sdMpoBzppyGW18VYrGPDtvhYMzX9VvM');

let scoreBoard = {};
if (fs.existsSync('board.json')) {
  scoreBoard = JSON.parse(fs.readFileSync('board.json'));
} else {
  fs.writeFileSync('board.json', JSON.stringify(scoreBoard));
}

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
        players: [ctx.from.id],
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
      if (gameData.currentPlayerIndex === 0 && ctx.from.id !== gameData.starterId) {
        await ctx.answerCbQuery('Oyunu başlatan kişi ilk hamleyi yapmalı.');
      } else {
        await ctx.answerCbQuery('Şimdi sıra diğerinde.');
      }
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
        for (let i = 0; i < buttons.length; i++) {
          for (let j = 0; j < buttons[i].length; j++) {
            if (gameData.bombButtons.includes('btn' + (i * 6 + j))) {
              buttons[i][j] = Markup.button.callback('💣', 'btn' + (i * 6 + j));
            }
          }
        }

        let loserId = String(ctx.from.id);
        if (!scoreBoard[loserId]) {
          scoreBoard[loserId] = { score: 0, gamesPlayed: 0 };
        }
        scoreBoard[loserId].score -= 1;
        scoreBoard[loserId].gamesPlayed += 1;

        let winnerId = String(gameData.players[(gameData.currentPlayerIndex + 1) % gameData.players.length]);
        if (!scoreBoard[winnerId]) {
          scoreBoard[winnerId] = { score: 0, gamesPlayed: 0 };
        }
        scoreBoard[winnerId].score += 1;
        scoreBoard[winnerId].gamesPlayed += 1;

        fs.writeFileSync('board.json', JSON.stringify(scoreBoard));

        await ctx.editMessageText(
          `Bomb! Kaybettin ${ctx.from.first_name}`,
          Markup.inlineKeyboard(buttons)
        );

        setTimeout(async () => {
          try {
            await ctx.deleteMessage();
          } catch (err) {
            console.log('Mesaj zaten silinmiş.');
          }
        }, 60000);

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

bot.command('cancel', async (ctx) => {
  const userId = String(ctx.from.id);
  if (!gameData.players || gameData.players.length === 0) {
    ctx.reply('Bu komutu kullanmak için bir oyunun başlamış olması gerekiyor.');
  } else {
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some(admin => admin.user.id === ctx.from.id);
    const isGameStarter = gameData.starterId === userId;

    if (isGameStarter || isAdmin) {
      if (isGameStarter) {
        gameData = {
          bombButtons: [],
          blackHeartButtons: [],
          currentPlayerIndex: 0,
        };
        ctx.reply('Oyun durduruldu.');
      } else {
        ctx.reply('Sen admin olsan da oyunu sen başlatmadın, gerçekten durdurmak istiyor musun?', 
          Markup.inlineKeyboard([
            Markup.button.callback('Evet', 'cancel_yes'),
            Markup.button.callback('Hayır', 'cancel_no'),
          ])
        );
      }
    } else {
      ctx.reply('Oyunu sen başlatmadın ki, sen de durdurasın!');
    }
  }
});

bot.action('cancel_yes', async (ctx) => {
  if (ctx.from.id === gameData.starterId) {
    ctx.answerCbQuery('Bu buton senin için değil.');
  } else {
    gameData = {
      bombButtons: [],
      blackHeartButtons: [],
      currentPlayerIndex: 0,
    };
    await ctx.editMessageText('Oyun durduruldu.');
  }
});

bot.action('cancel_no', async (ctx) => {
  if (ctx.from.id === gameData.starterId) {
    ctx.answerCbQuery('Bu buton senin için değil.');
  } else {
    await ctx.editMessageText('Oyun devam ediyor!');
  }
});

bot.command('point', (ctx) => {
  const userId = String(ctx.from.id);
  if (scoreBoard[userId]) {
    ctx.reply(`Sizin toplam puanınız: ${scoreBoard[userId].score}, Oynadığınız oyun sayısı: ${scoreBoard[userId].gamesPlayed}`);
  } else {
    ctx.reply("Oynadığınız oyun yok.");
  }
});

bot.command('board', async (ctx) => {
  const sortedScores = Object.entries(scoreBoard).sort((a, b) => b[1].score - a[1].score).slice(0, 20);
  const scoreStrings = await Promise.all(
    sortedScores.map(async ([userId, userInfo], index) => {
      const user = await bot.telegram.getChat(userId);
      return `${index + 1}. ${user.first_name}: ${userInfo.score}`;
    })
  );
  ctx.reply(scoreStrings.join('\n'));
});

bot.launch();
