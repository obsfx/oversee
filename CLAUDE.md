
### introduction

This file contains the information and direction about the application we called `oversee`.

- **oversee**
    - is a **diff-viewer** and **line-annotation** tool.
    - works on **browser**.
- it displays the **diff** gathered using **git**. therefore this app only going to work on **git repositories**.
- currently we are focusing on the **full frontend functionality off the app**. this project of course needs a backend to gather **the git diff** and the **file tree** of the git repository. but we are **not gonna put a lot of effort to the backend part at this stage**. we simply put a **mockup backend** to achieve the **functionality of the frontend** but we gonna do the bare minimum on the backend. you can simply use the `../oversee-proto-backend` for it. the backend part is another topic and we are gonna do it in another time. so focus on **frontend**

### how the mock-up back-end going to work
- just do the bare minimum, but functionality wise it should contain the core principles we can convert it to a **real** app easily.
- it just just point to an hard coded directory: `/Users/omercanbalandi/oaks-lab/storyvine/now-api` we gonna use there as a test directory. so we can just get the git diff and file tree from that directory.
- use a sqlite db for data persistency

### core component off the app

Check the following layout representation: `/Users/omercanbalandi/studio-2/oversee-visual-material/general-layout.png`

Let me explain the **core components of the app, the sections are color coded**. So you can match them easily.

##### Sidebar
- the section will show the **file tree**.
- `@pierre/trees` will be empowering it. the skill can be installable `npx skills add https://github.com/pierrecomputer/pierre --skill trees` for better understanding of the tool.
- **working principle** is
    - on initial start a non blocking API request is made to the backend.
    - backend will run the necessary bash or git commands to gather the file tree.
    - we should properly display the `MODIFIED`, `REMOVED`, `ADDED` markers on the file item.
    - we should be able to display additional custom icons on the left side of the file item. a possible case for it would be like, our app is gonna have `mark as reviewed` function. and if a file is `mark as reviewed` we are going to need to show a custom icon, possibly like a `greencheckmark`.
- sidebar should have a **resizable width**. we need to have an handle on the right edge of the sidebar, so we can adjust its width.
- sidebar will be `expandable/collapsible`, we are going to have a toggle button in the **topbar**.
- when we select an item from the file tree, we should see that file in the **diff-view**.
- this section needs a loader component that we show while we are gathering the file tree information from the backend.

##### Topbar
- it contains the button to toggle the **sidebar**
    - it will be icon button, it should properly reflect its `expaded or collapsed` state by showing the proper icon.
- it contains the **branch selection** which means the current and target branch selection and option for viewing uncommitted changes.
    - the **dropdown** component could be a native component or a component built around some UI library, we will discuss this during the development.
- a settings button and its menu
    - this settings menu provides these settings
        - theme selection, light or dark
        - font selection for ui and editor, powered by google fonts
- a button and popover menu that shows the comment count that user put there
    - it should show the count on the button
    - when we click on it it should open the popover
        - and inside of the popover we should see the list of the comments
        - when we click on one of the comments, we should navigate the file we put that comment and we also need to scroll that position

##### Toolbar
- it contains a section that
    - `[prevButton] {currentFileNumber} / {totalFileNumber} [nextButton]` so something like `[<] 4 / 72 [>]`
- side-by-side and unified view toggle
- total difference count in that file
- `expand/collapse unchanged sections` button

##### Diff viewer
- empowered with `@pierre/diffs`, the skill can be installable `npx skills add https://github.com/pierrecomputer/pierre --skill diffs` for better understand of the tool
- we will show `1 file at a time`
- we should be able to `annotate the lines, line selections`
- when we added a line annotation, it will send to the backend and saved to a database.
- when we open a file diff, we should be able to see the added comments, that we fetch from the backend.
- this sections needs a loader component that we show while we are gathering the diff information from the backend.

### component development decision flow
- every major component design should be approved.
- we follow **storybook first** principle. ever component should take a place in storybook first.
- we need to create **alternatives for a component**. alternatives should be reviewed and picked by the **developer**. then we should implement it to the storybook first. then we can put it to the app.
- components should be **screen space efficient**. we should go with **compact** design for every part of the app. we should save the space for the **diff-viewer** because that is the most important part of the app. that is the part we actually read and review the code.

### how we design systems
- complexity should be placed under **class definitions**
- if a class only created one time, we need to go with **abstract classes**.
- if a class can be injected somewhere, we need to with normal classes.
- we never put the logic and complexity in class components, complexity is placed in custom hooks. and custom hooks will orchestrate the necessary classes to the intended actions.
- while styling components with tailwind, if we have long classnames or conditional classnames, utilize `/Users/omercanbalandi/studio-2/oversee/src/c.ts`
- always use `trekker`. trekker is the source of our persistent work. create epics and tasks for a certain achievement.
- the `testing` phase always a seperate task or epic from the main `tasks`. always cleanup and close the open tasks or epics when it is completed.
- do not use `fallow` in this project.
- state management is `zustand`. stores live in `./src/store`.
- react contexts live in `./src/context/<name>/`, together with the hook that consumes them and their provider.
- prefer `interface` over `type` for object shapes.
- if https://usehooks.com/ (`@uidotdev/usehooks`) already provides a hook, use it instead of writing one from scratch.
- never add hard limits to lists to protect rendering performance. render everything and use virtual lists (`@tanstack/react-virtual`) when needed.
- never use unicode symbols such as `…`, `·`, `→` in source text. use plain text, or an icon from `react-icons` for symbols.
- use `plur` for count based pluralization.
- always use curly braces for `if` bodies and arrow function bodies.

### overall folder structure
- `./src/primitives`: it contains the tailwind style components, no logic. tailwind classes could be long enough to populate whole screen. so we gonna `hide` that styled components with tailwind that has very long class names so we are not polluting the component body with that long class names
- `./src/components`: component logic that is using `primitives`. this files can contain logic but when it comes to logic remember the rules we defined in **how we design systems**
- `./src/lib`: our class definitions will be located in there. our custom hooks will use these classes to achieve the functionality
- `./src/store`: our state management will be placed there
- `./src/store`: a layout consist of multiple components and defines an overall `page`. they will be located here
- `./src/hooks`: custom hooks handles the logic of the components. these stuff will be using logic defined in `./src/lib`
- `./src/context`: react contexts, each in its own folder with its consumer hook and provider
- `./src/stories`: every story lives here, mirroring the source folders (`primitives`, `components`, `layouts`). never place stories next to components. every primitive and component gets a story so the project has a record of what exists


