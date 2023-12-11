const snoowrap = require('snoowrap');
const { addComment } = require('./log');
require('dotenv').config();

const r = new snoowrap({
  userAgent: 'GuessMyRaceBot v1.0',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
  refreshToken: process.env.REDDIT_REFRESH_TOKEN
});

class Bot {
  constructor() {
    this.shouldContinue = true;
    this.botUsername = 'GuessMyRaceBOT'; // Specify the bot's username here
  }

  processComment(comment) {
    // Check if the post title or any comment includes the "!GMR" keyword
    const postHasKeyword = comment.link_title.includes('!GMR');
    const commentHasKeyword = comment.body.includes('!GMR');

    if (postHasKeyword || commentHasKeyword) {
      // Fetch all the comments on the post
      r.getSubmission(comment.link_id)
        .expandReplies({ limit: Infinity, depth: Infinity })
        .then((post) => {
          // Iterate through each comment on the post
          post.comments.forEach((postComment, index) => {
            // Exclude the bot's own comments to avoid replying to them
            if (postComment.author.name !== this.botUsername) {
              // Generate an appropriate response using Generative AI

              // Example response:
              const response = 'Good guess (TEST)!';

              // Delay the comment reply using setTimeout
              setTimeout(() => {
                // Reply to the comment
                const replyWithRetry = () => {
                  postComment
                    .reply(response)
                    .then((comment) => {
                      // Check if the comment is from the bot itself
                      const isBotComment = comment.author.name === this.botUsername;

                      // If the comment is from the bot, approve it
                      if (isBotComment) {
                        comment.approve()
                          .then(() => {
                            console.log('Bot comment approved');
                          })
                          .catch((error) => {
                            console.error('Failed to approve bot comment:', error);
                          });
                      }

                      // Log the comment details to the frontend table
                      const commentData = {
                        date: new Date(),
                        postTitle: postComment.link_title,
                        postUrl: postComment.link_url,
                        commentUrl: `https://reddit.com${postComment.permalink}`
                      };

                      // Log the commentData object
                      addComment(commentData);
                    })
                    .catch((error) => {
                      if (error.statusCode === 429) {
                        console.log('Rate limited. Retrying after 5 seconds...');
                        setTimeout(replyWithRetry, 5000); // Retry after 5 seconds
                      } else {
                        console.error('Failed to reply to comment:', error);
                      }
                    });
                };

                replyWithRetry();
              }, index * 5000); // Delay each comment reply by 5 seconds (adjust as needed)
            }
          });
        })
        .catch((err) => {
          console.error('Failed to fetch post comments:', err);
        });
    }
  }

  processSubreddit(subreddit) {
    subreddit
      .getNewComments()
      .then((comments) => {
        comments.forEach((comment) => {
          // Process each comment
          this.processComment(comment);
        });
      })
      .catch((err) => {
        console.error('Failed to get comments:', err);
        this.shouldContinue = false; // Stop the bot if an error occurs
      })
      .finally(() => {
        // Continue processing comments if the flag is still true
        if (this.shouldContinue) {
          setTimeout(() => {
            this.processSubreddit(subreddit);
          }, 0);
        }
      });
  }

  isRunning() {
    return this.shouldContinue;
  }

  startBot() {
    r.getSubreddit('guessmyrace')
      .fetch()
      .then((subreddit) => {
        console.log('Connected to subreddit:', subreddit.display_name);

        // Process comments immediately
        this.processSubreddit(subreddit);

        // Set a timer to stop the bot after 5 minutes (300,000 milliseconds)
        setTimeout(() => {
          this.shouldContinue = false;
          console.log('Stopping the bot...');
        }, 300000);
      })
      .catch((err) => {
        console.error('Failed to connect to subreddit:', err);
      });
  }
}

const bot = new Bot();
module.exports = { startBot: bot.startBot.bind(bot), isRunning: bot.isRunning.bind(bot) };