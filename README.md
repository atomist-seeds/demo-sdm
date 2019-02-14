<p align="center">
  <img src="https://images.atomist.com/sdm/SDM-Logo-Dark.png">
</p>

# @atomist/demo-sdm

[![npm version](https://img.shields.io/npm/v/@atomist/demo-sdm.svg)](https://www.npmjs.com/package/@atomist/demo-sdm)

Atomist software delivery machine for demo projects.

Software delivery machines enable you to control your delivery process
in code.  Think of it as an API for your software delivery.  See the
[Atomist documentation][atomist-doc] for more information on the
concept of a software delivery machine and how to create and develop
an SDM.

[atomist-doc]: https://docs.atomist.com/ (Atomist Documentation)

## Demos

### GeneratorCommand: Project Creation from seed

To create a project from seed use `create spring` in a DM with the atomist bot. Go through the
creation and click the button to create a linked channel.

Notice that repo gets tagged automatically by the SDM.

### CodeTransform: Add Dockerfile

When joining the newly created and linked channel, you'll see a button called `Add Dockerfile`.

Clicking this button with run a `CodeTransform` and push to a new branch. When the build on this branch
succeeds, a PR will be created. Once the goal set finishes successfully, the PR will get merged automatically.

This is a build-aware CodeTransform with an auto-merge PR.

### CodeInspection: Import java.io.File

Edit any Java source in your repo and add an import for `import java.io.File;`. This will be flagged in the
Cloud Native code inspection. Notice the newly created issue for this violation.

Once you remove the import again, the created issue gets closed and the body updated.

### Autofix: Add @Autowired to a constructor

Edit the Application class and add the `@ComponentScan` annotation to the class. Don't forget to also add the import
to `import org.springframework.context.annotation.ComponentScan;`

The autofix will remove the unnecessary annotation.

### Deployment: Deploy to k8

Once the Dockerfile PR is merged into master, the app will get deployed to our demo cluster. It will go straight to
`testing` namespace. Click the link next to the goal to navigate to the running app.

Deployment to production can get triggered by starting the `deploy to production` goal.

On successful deploy to production, the version in the `pom.xml` will get incremented too.

### Env-based Issue Labels

Make sure to deploy your service at least once to the env, before running this demo.

Create a new issue in the your repo; make a commit referencing the issue with `fixes #1` in your commit message.

Let the build complete and see the app getting deployed to the `testing` namespace. Once it is running, a new label
`env:gke-int-demo:testing` should be added to your issue.

## Getting started

See the [Developer Quick Start][atomist-quick] to jump straight to
creating an SDM.

[atomist-quick]: https://docs.atomist.com/quick-start/ (Atomist - Developer Quick Start)

## Contributing

Contributions to this project from community members are encouraged
and appreciated. Please review the [Contributing
Guidelines](CONTRIBUTING.md) for more information. Also see the
[Development](#development) section in this document.

## Code of conduct

This project is governed by the [Code of
Conduct](CODE_OF_CONDUCT.md). You are expected to act in accordance
with this code by participating. Please report any unacceptable
behavior to code-of-conduct@atomist.com.

## Documentation

Please see [docs.atomist.com][atomist-doc] for
[developer][atomist-doc-sdm] documentation.

[atomist-doc-sdm]: https://docs.atomist.com/developer/sdm/ (Atomist Documentation - SDM Developer)

## Connect

Follow [@atomist][atomist-twitter] and [The Composition][atomist-blog]
blog related to SDM.

[atomist-twitter]: https://twitter.com/atomist (Atomist on Twitter)
[atomist-blog]: https://the-composition.com/ (The Composition - The Official Atomist Blog)

## Support

General support questions should be discussed in the `#support`
channel in the [Atomist community Slack workspace][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist-seeds/empty-sdm/issues

## Development

You will need to install [Node.js][node] to build and test this
project.

[node]: https://nodejs.org/ (Node.js)

### Build and test

Install dependencies.

```
$ npm install
```

Use the `build` package script to compile, test, lint, and build the
documentation.

```
$ npm run build
```

### Release

Releases are handled via the [Atomist SDM][atomist-sdm].  Just press
the 'Approve' button in the Atomist dashboard or Slack.

[atomist-sdm]: https://github.com/atomist/atomist-sdm (Atomist Software Delivery Machine)

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
