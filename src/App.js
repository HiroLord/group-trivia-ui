import React, { Component } from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import './App.css';

import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import Dialog from 'material-ui/Dialog';
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';
import Divider from 'material-ui/Divider';

import moment from 'moment';

const firebase = require('firebase');
require('firebase/firestore');
var config = {
    apiKey: "AIzaSyBiYZydN2cvoqW0K3g5QBnd3HYzmndeUxE",
    authDomain: "group-trivia.firebaseapp.com",
    databaseURL: "https://group-trivia.firebaseio.com",
    projectId: "group-trivia",
    storageBucket: "group-trivia.appspot.com",
    messagingSenderId: "43592979053"
};
firebase.initializeApp(config);

const db = firebase.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

const styles = {
  errorStyle: {
    color: 'red',
  },
  correctStyle: {
    color: 'green',
  },
};

class App extends Component {

  state = {
    answer: '',
    oldAnswer: '',
    correct: false,
    submitting: false,
    chat: '',
    chats: [],
    players: [],
    open: true,
    name: sessionStorage.getItem('name') || '',
    color: sessionStorage.getItem('color') || '',
    answers: [],
  }

  componentWillMount() {
    db.collection('chats').where('active', '==', true)
      .orderBy('timestamp', 'desc')
      .limit(40)
      .onSnapshot((snap) => {
        const chats = [];
        snap.forEach((chat) => {
          chats.unshift(chat.data());
        });
        this.setState({
          chats,
        });
        this.el.scrollIntoView({ behavior: 'smooth' });
      })

    db.collection('players').where('online', '==', true)
      .orderBy('points', 'desc')
      .onSnapshot((snap) => {
        const players = [];
        snap.forEach((player) => {
          players.push(player.data());
        });
        console.log(players);
        this.setState({
          players,
        })
      })

    db.collection('answers').where('processed', '==', true)
      .orderBy('timestamp', 'desc')
      .limit(8)
      .onSnapshot((snap) => {
        const answers = [];
        snap.forEach((answer) => {
          answers.push(answer.data());
        });
        console.log(answers);
        this.setState({
          answers,
        })
      })
  }

  addChat = () => {
    if (this.state.submitting || this.state.chat.length < 2) {
      return;
    }
    this.setState({
      submitting: true,
    })
    db.collection('chats').add({
      text: this.state.chat,
      color: this.state.color,
      active: true,
      timestamp: moment().unix(),
      name: this.state.name,
    }).catch((err) => {
      this.setState({
        err,
      })
    }).then(() => {
      this.setState({
        chat: '',
      })
      setTimeout(() => {
        this.setState({
          submitting: false,          
        })
      }, 1000)
    });
  }

  addAnswer = () => {
    if (this.state.submitting || this.state.answer.length < 2) {
      return;
    }
    this.setState({
      submitting: true,
    })
    db.collection('answers').add({
      answer: this.state.answer,
      processed: false,
      name: this.state.name,
      timestamp: moment().unix(),
    }).catch((err) => {
      this.setState({
        err,
      })
    }).then((res) => {
      this.setState({
        answer: '',
        submitting: false,
      })
      if (res) {
        res.onSnapshot((doc) => {
          const data = doc.data();
          if (data.processed) {
            this.setState({
              correct: data.correct,
              oldAnswer: data.answer,
            })
          }
        })
      }
    })
  }

  submitName = async () => {
    if (this.state.name.length < 4) return;
    this.setState({
      submitting: true,
    })
    const name = this.state.name;
    const points = await db.collection('players').doc(name).get().then(res => res.data() ? res.data().points : 0).catch(err => 0) || 0;
    db.collection('players').doc(name).set({
      name,
      color: this.state.color,
      online: true,
      points,
    })
    .catch((err) => {
      this.setState({
        err,
      })
    }).then((res) => {
      sessionStorage.setItem('name', this.state.name);
      sessionStorage.setItem('color', this.state.color);
      this.setState({
        open: false,
        submitting: false,
      })
      // window.onbeforeunload = () => {
      //   db.collection('players').doc(name).set({
      //     name,
      //     online: false,
      //   })
      //   if (!this.state.open) {
      //     this.setState({
      //       open: true,
      //     })
      //     return 'You have logged out.';
      //   }
      // }
    })
  }

  render() {
    const actions = [
      <FlatButton
        label="Submit"
        primary
        onClick={this.submitName}
        disabled={this.state.submitting}
      />,
    ];
    const colors = ['red', 'blue', 'green', 'orange', 'black', 'chartreuse', 'magenta', 'turquoise', 'coral', 'orchid', 'seagreen']

    return (
      <MuiThemeProvider>
        <div className="App">
          <header className="App-header">
            {/* <img src={logo} className="App-logo" alt="logo" /> */}
            <h1 className="App-title">Welcome to Group Trivia Night</h1>
            <div
              style={{
                marginTop: '-15px',
              }}
            >v0.0.3</div>
          </header>
          <Dialog
            title="What is your name?"
            actions={actions}
            modal={false}
            open={this.state.open}
          >
            <TextField
              floatingLabelText="name"
              value={this.state.name}
              disabled={this.state.submitting}
              onChange={event => this.setState({
                name: event.target.value.toLowerCase(),
              })}
              onKeyPress={(ev) => {
                if (ev.key === 'Enter') {
                  this.submitName();
                  ev.preventDefault();
                }
              }}
            />
            <br/>
            <SelectField
              floatingLabelText="Favorite Color"
              value={this.state.color}
              onChange={(e, k, color) => this.setState({
                color,
              })}
              labelStyle={{
                color: this.state.color,
              }}
              selectedMenuItemStyle={{
                color: this.state.color,
              }}
            >
              <MenuItem />
              { colors.map((c) => (
                <MenuItem value={c} primaryText={c} style={{color: c}} />
              ))}
            </SelectField>
          </Dialog>
          <div
            style={{
              minWidth: '20em',
              padding: '.5em',
              float: 'left',
            }}
          >
            <TextField
              // hintText="answer goes here"
              floatingLabelText="answers go here"
              // floatingLabelFixed={true}
              value={this.state.answer}
              // disabled={this.state.submitting}
              fullWidth
              keyboardFocused
              errorText={this.state.oldAnswer && `'${this.state.oldAnswer}' was ${this.state.correct ? 'right!' : 'wrong'}`}
              // floatingLabelStyle={{ color: 'black' }}
              errorStyle={this.state.correct ? styles.correctStyle : styles.errorStyle}
              onChange={event => this.setState({
                answer: event.target.value,
              })}
              onKeyPress={(ev) => {
                if (ev.key === 'Enter') {
                  this.addAnswer();
                  ev.preventDefault();
                }
              }}
            />
            <br />
            <RaisedButton fullWidth label="Submit" onClick={this.addAnswer} disabled={this.state.submitting || this.state.answer.length < 2} />
            <br />
            <br />
            <div
              style={{
                height: '20em',
                border: '1px solid #66d',
                overflow: 'scroll',
                textAlign: 'left',
                padding: '0.5em',
              }}
            >
              {
                this.state.chats.map((msg) => 
                  <ChatMessage
                    {...msg}
                  />
                )
              }
              <div
                ref={el => { this.el = el; }}
              />
            </div>
            <TextField
              fullWidth
              hintText="chat"
              value={this.state.chat}
              onChange={(event) => this.setState({
                chat: event.target.value,
              })}
              onKeyPress={(ev) => {
                if (ev.key === 'Enter') {
                  this.addChat();
                  ev.preventDefault();
                }
              }}
            />
            <RaisedButton fullWidth label="Chat" onClick={this.addChat} disabled={this.state.submitting || this.state.chat.length < 2} />
            <div style={{ fontWeight: 'bold', fontSize: '28pt', marginTop: '0.4em' }}>Scores</div>
            <Divider />
            <div>
              {
                this.state.players.map((player) => 
                  <ScoreCard
                    {...player}
                  />
                )
              }
            </div>
            <Divider />
          </div>
          <div style={{
            // position: 'absolute',
            // left: '22em',
            // top: '70px',
            // clear: 'left',
          }}>
            {
              this.state.answers.map((answer) => (
                <Answer
                  {...answer}
                />
              ))
            }
          </div>
        </div>
      </MuiThemeProvider>
    );
  }
}

const Answer = (props) => (
  <div style={{ textAlign: 'left', padding: '0.5em' }}>
    <span style={{ fontSize: '15pt' }}>"{props.answer}"</span><br />
    <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>submitted by {props.name}</span><br />
    <span style={{ fontSize: '10pt', color: props.correct ? 'green' : 'red' }}>{props.correct ? 'RIGHT!' : 'wrong'}</span><br />
  </div>
)

const ScoreCard = (props) => (
  <div style={{ fontSize: '15pt' }}>
    <span style={{ color: props.color, fontWeight: 'bold' }}>{props.name}: </span><span>{props.points}</span>
  </div>
)

const ChatMessage = (props) => (
  <div style={{
    marginTop: '2px',
  }}>
    <span style={{ color: props.color, fontWeight: 'bold' }}>{props.name}: </span><span>{props.text}</span>
  </div>
);

export default App;
