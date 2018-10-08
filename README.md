# @atomistplay/demo-sdm

an Atomist demo software delivery machine

Instance of an Atomist Software Delivery Machine that can be used to
automate delivery of Atomist automatiom-client projects, like SDMs.

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
 

## What is a Software Delivery Machine?

> A **software delivery machine** is a development process in a box.

It automates all steps in the flow from commit to production
(potentially via staging environments), and many other actions, using
the consistent model provided by the Atomist *API for software*.

> Many teams have a blueprint in their mind for how they'd like to
> deliver software and ease their day to day work, but find it hard to
> realize. A Software Delivery Machine makes it possible.

The concept is explained in detail in Rod Johnson's blog [Why you need
a Software Delivery
Machine](https://the-composition.com/why-you-need-a-software-delivery-machine-85e8399cdfc0). This
[video](https://vimeo.com/260496136) shows it in action.

Please see the [Atomist SDM
library](https://github.com/atomist/sdm) for explanation on
what an SDM can do. The present document describes how to get yours
running.

## Get Started

This delivery machine feeds on the Atomist API. You'll need to be a
member of an Atomist workspace to run it. <!-- TODO: reference auth
story --> Create your own by
[enrolling](https://github.com/atomist/welcome/blob/master/enroll.md)
at [atomist.com](https://atomist.com/).

Things work best if you install an org webhook, so that Atomist
receives events for all your GitHub repos.

## Get your Software Delivery Machine

If the Atomist bot is in your Slack team, type `@atomist create sdm`
to have Atomist create a personalized version of this repository for
you.

Alternatively, you can fork and clone this repository.

## Running

Below are instructions for running locally and on Kubernetes.  See
[integrations](#Integrations) for additional prerequisites according
to the projects you're building.

### Locally

This is an Atomist automation client. See [run an automation
client](https://github.com/atomist/welcome/blob/master/runClient.md)
for instructions on how to set up your environment and run it under
Node.js.

The client logs to the console so you can see it go.

### Kubernetes

You can use the Kubernetes resource files in the [kube
directory][kube] as a starting point for deploying this automation in
your Kubernetes cluster.

This SDM needs write access to jobs and read-access to deployments in
its namespaces.  It uses the Kubernetes "in-cluster client" to
authenticate against the Kubernetes API.  Depending on whether your
cluster is using [role-based access control (RBAC)][rbac] or not, you
must deploy slightly differently.  RBAC is a feature of more recent
versions of Kubernetes, for example it is enabled by default on [GKE
clusters][gke-rbac] using Kubernetes 1.6 and higher.  If your cluster
is older or is not using RBAC, the default system account provided to
all pods should have sufficient permissions to run this SDM.

Before deploying either with or without RBAC, you will need to create
a namespace for the resources and a secret with the configuration.
The only required configuration values are the `teamIds` and `token`.
The `teamIds` should be your Atomist team ID(s), which you can get
from the settings page for your Atomist workspace or by sending `team`
as a message to the Atomist bot, e.g., `@atomist team`, in Slack.  The
`token` should be a [GitHub personal access token][ghpat] with
`read:org` and `repo` scopes.

```console
$ kubectl apply -f https://raw.githubusercontent.com/atomist/atomist-sdm/master/assets/kube/namespace.yaml
$ kubectl create secret --namespace=sdm generic automation \
    --from-literal=config='{"teamIds":["TEAM_ID"],"token":"TOKEN"}'
```

In the above commands, replace `TEAM_ID` with your Atomist team ID,
and `TOKEN` with your GitHub token.

[kube]: ./assets/kube/ (Kubernetes Resources)
[rbac]: https://kubernetes.io/docs/admin/authorization/rbac/ (Kubernetes RBAC)
[gke-rbac]: https://cloud.google.com/kubernetes-engine/docs/how-to/role-based-access-control (GKE RBAC)
[ghpat]: https://github.com/settings/tokens (GitHub Personal Access Tokens)

### RBAC

If your Kubernetes cluster uses RBAC (minikube does), you can deploy with the
following commands

```console
$ kubectl apply -f https://raw.githubusercontent.com/atomist/atomist-sdm/master/assets/kube/rbac.yaml
$ kubectl apply -f https://raw.githubusercontent.com/atomist/atomist-sdm/master/assets/kube/deployment-rbac.yaml
```

If you get the following error when running the first command,

```
Error from server (Forbidden): error when creating "rbac.yaml": clusterroles.rbac.authorization.k8s.io "sdm-role" is forbidden: attempt to grant extra privileges: [...] user=&{YOUR_USER  [system:authenticated] map[]} ownerrules=[PolicyRule{Resources:["selfsubjectaccessreviews"], APIGroups:["authorization.k8s.io"], Verbs:["create"]} PolicyRule{NonResourceURLs:["/api" "/api/*" "/apis" "/apis/*" "/healthz" "/swagger-2.0.0.pb-v1" "/swagger.json" "/swaggerapi" "/swaggerapi/*" "/version"], Verbs:["get"]}] ruleResolutionErrors=[]
```

then your Kubernetes user does not have administrative privileges on
your cluster.  You will either need to ask someone who has admin
privileges on the cluster to create the RBAC resources or try to
escalate your privileges with the following command.

```console
$ kubectl create clusterrolebinding cluster-admin-binding --clusterrole cluster-admin \
    --user YOUR_USER
```

If you are running on GKE, you can supply your user name using the
`gcloud` utility.

```console
$ kubectl create clusterrolebinding cluster-admin-binding --clusterrole cluster-admin \
    --user $(gcloud config get-value account)
```

Then run the command to create the `kube/rbac.yaml` resources again.

### Without RBAC

To deploy on clusters without RBAC, run the following commands

```console
$ kubectl apply -f https://raw.githubusercontent.com/atomist/atomist-sdm/master/assets/kube/deployment-no-rbac.yaml
```

If the logs from the pod have lines indicating a failure to access the
Kubernetes API, then the default service account does not have read
permissions to pods and you likely need to deploy using RBAC.

## Using the SDM

Once this SDM is running, here are some things to do:

### Push to an existing repository

If you have any Java or Node projects in your GitHub org, try linking
one to a Slack channel (`@atomist link repo`), and then push to it.
You'll see Atomist react to the push, and the SDM might have some
Goals it can complete.

### Customize

Every organization has a different environment and different
needs. Your software delivery machine is yours: change the code and do
what helps you.

> Atomist is about developing your development experience by using
> your coding skills. Change the code, restart, and see your new
> automations and changed behavior across all your projects, within
> seconds.

### Kubernetes

The kubernetesSoftwareDevelopmentMachine included here deploys to your
Kubernetes cluster, using
[k8-automation](https://github.com/atomist/k8-automation), which you
must run in your cluster.  To deploy to Kubernetes using this SDM and
k8-automation, set the `MACHINE_NAME` environment variable to
`k8sMachine` before starting the SDM.

## Support

General support questions should be discussed in the `#support`
channel in our community Slack team
at [atomist-community.slack.com][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/atomist-sdm/issues

## Development

You will need to install [node][] to build and test this project.

### Build and Test

Command | Reason
------- | ------
`npm install` | install all the required packages
`npm run build` | lint, compile, and test
`npm start` | start the Atomist automation client
`npm run autostart` | run the client, refreshing when files change
`npm run lint` | run tslint against the TypeScript
`npm run compile` | compile all TypeScript into JavaScript
`npm test` | run tests and ensure everything is working
`npm run autotest` | run tests continuously
`npm run clean` | remove stray compiled JavaScript files and build directory

### Release

Releases are handled via the SDM itself.  Just press the release
button in Slack or the Atomist dashboard.

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack team][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
