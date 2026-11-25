# Tic Tac Chaos

Tic-tac-toe on a Rubik's cube. Get 5 in a row on the outside of the cube, across its edges and around
its corners. Six hidden chaos cells turn slices of the cube when someone lands on one, moving marks
around.

Play against the computer (Easy, Medium or Hard) or against another person on the same device. A
screen reader and keyboard mode is in the menu.

The full rules are in [docs/game-rules.md](docs/game-rules.md).

## Run it

You need Node and Yarn.

```sh
yarn install
yarn dev        # then open the address it prints
```

## Check it

```sh
yarn test       # all the tests
yarn lint
yarn typecheck
yarn build      # a production build in dist/
```
