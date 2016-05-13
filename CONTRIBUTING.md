# Contributing to Oddworks

First thank you for contributing to Oddworks. We know your time is valuable and we are glad that you want to share some of it with us!

The following guidelines will help you to create a valuable contribution.

## Contents

- [Rules, Regulations and Stuff](#rules)
- [Code of Conduct](#conduct)
- [Questions or Concerns](#questions)
- [Project Structure](#structure)

- [How to Contribute](#how)
    - [Bugs](#bugs)
    - [Feature Requests](#features)
    - [Code](#code)

- [Styleguides & Specs](#style)

- [Notes](#notes)

## <a name="rules">Rules, Regulations and Stuff</a>

We want to stress that the most important thing is the contibution and not the text editor used to create it. In this spirit, this document is offered as a guide and the rules we lay out may be streched or broken, if need be, **but please do so only for valid reasons**. Please use your best judgement but also don't be surprised if we ask you to adjust something to better conform with the project guidelines.

## <a name="conduct">Code of Conduct</a>
We want to grow an open and stress free environment for all. The general rules are treat others with the respect you would like to be treated with. We reserve the right to refuse participation to any person whom we feel is not following these simple concepts. For a more detailed version of this code of conduct you can review [Our Official Code of Conduct.](http://contributor-covenant.org/version/1/4/) Violations or concerns with the Code of Conduct may be reported [here.](conduct@oddnetworks.com)

##  <a name="questions">Questions or Concerns</a>
If you have a question regarding Oddworks or contributing, the best way to get in touch is via our [Slack Channel.](http://slack.oddnetworks.com) If you need to use good old email we can be reached [here.](mailto:hello@oddnetworks.com)

##  <a name="structure">Project Structure</a>
Oddworks is designed to be modular and supports a plug-in architecture. The main Oddworks project is a [Node](http://nodejs.org) module that is incorporated into your server project in order to interface with Oddworks, the API and make use of the device SDKs. Other modules include example projects that show how to create server architecures of different types or provide a rich set of sample data to get your started.

Please make sure you submit your contribution to the correct project. If your contribution is a general plug-in, for example a new Store type, submit directly to Oddworks and we will find a home for it. If you have a new server example again submit to Oddworks. If you are offering a correction, bug fix or feature update be sure to submit to the correct repository.

If you're not sure hit us up in our [Slack Channel.](http://slack.oddnetworks.com)  

##  <a name="how">How to Contribute</a>
No contribution is too small or unimportant. This is a large project and all help is appreciated. Your simple correction to a typo in our documentation may make the intent clearer and frees others to work on different parts of the project.

Here are the general areas you can contribute:

###<a name="bugs">Bugs</a>
If you find a bug in any of our projects please create an issue in [Github](https://github.com/oddnetworks/oddworks) under the appropriate project.

- **The best way to get a bug fixed is to code it up and submit a pull request explaining the issue and your fix. We like these a lot.**
- Please be certain the 'bug' is a 'bug.' Its possible Oddworks is working as designed. In this case, your 'bug' would be a feature request.
- Check that you have the latest versions of all modules.
- Are you sure the bug is in Oddworks and not in your code used to implement Oddworks?
- Check the existing issues to see if it has already been reported. Feel free to include additional information on existing issues.
- When creating a new issue, create a clear title so its obvious what the problem is 
- Describe, with as much detail as possible, what the problem is.
- Indicate the expected behavior vs the actual behavior
- List any steps that can be taken to reproduce the error **(being able to reproduce errors is the first step to fixing them)**
- If data or supporting materials are required to reproduce the error, include them.
- If the problem generates a crash log or stack trace please include the relevant parts of these logs.
- If you have modified the code in any way that may have an impact on the issue include your changes or a reference to your fork.

### <a name="features">Feature Requests</a>
If you would like to see some new functionality added to Oddworks by all means make a suggestion.

- **The best way to get a new feature into Oddworks is to code it up and submit a pull request outlining the feature and reasoning behind it**
- We can not guarantee any features will be implemented but we can guarantee we will read requests and give them consideration.
- Are you certain we don't already support your feature? Perhaps in a different way than your considered? 
- Would your feature contradict a design decision or specification we are commited to supporting?
- Does the feature have broad appeal? i.e. would you be the only one to benefit?
- If we don't already have your feature or its not on the roadmap create a new [Github](https://github.com/oddnetworks/oddworks) issue and tag it with 'feature request'
- Provide a clear title
- Include a thorough description explaining the problem the feature request would solve and the methods to solve it, if known.
- Explain any conflicts the new feature may create
- Specify who would benefit from the feature
- Include bacon and/or beer. We like bacon and beer and may look favorably on feature requests that include them.

### <a name="code">Code</a>
**By far our favorite type of contribution is code. If you see a bug or want a new feature implemented, the single best thing you can do to see it included is to provide us with the code to solve the problem.**

- To submit code follow [githubs guidelines for working with pull requests](https://help.github.com/articles/using-pull-requests/)
- Always use a new branch for your pull request (keep this one in mind when you start work on a new item)
- Limit the pull request to a single feature or bug
- Provide a clear explanation of what the code submitted will do
- Provide new or revised tests to exercise your code (these tests should pass too)
- We utilize Travis for CI and any pull request submitted that fails Travis will not be considered. (check those trailing whitespaces, kids)

##  <a name="style">Styleguides & Specs</a>
- We're not style or grammar nazis but our linter is.
- Try to match our format for code style and we will get along just fine.
- Tabs, 4 spaces, no trailing whitespace, yadda, yadda.
- If you don't catch it Travis will and we will kick it back to you for review.
- Don't reinvent wheels or ask us to make exceptions to specifications
- We follow the [JSON API spec](http://jsonapi.org) any code you work with should continue to follow this spec.
 
##  <a name="notes">Notes</a>
**No contribution is too small. A single typo fix is helpful. All input is welcome and apprecitated.**

Some suggestions or pull requests may not be implemented but we will strive to explain why when that happens. We are honored you chose to contribute to our project but sometimes or goals are in different areas. We offer our sincere thanks and hope there are no hard feelings if we don't add your feature.

**Remember code is real. Talk is cheap. We welcome you to contribute to the discussion in our [Slack Channel.](http://slack.oddnetworks.com) but its not a bug report, feature request or pull request until you make an issue or a pull request in [Github](https://github.com/oddnetworks/oddworks).**