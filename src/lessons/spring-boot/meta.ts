import type { TopicMeta } from '../types';

export const meta: TopicMeta = {
  topic: 'spring-boot',
  title: 'Spring Boot',
  group: 'Spring',
  summary: 'Spring MVC 요청 처리, `@Transactional` proxy, bean lifecycle, auto-configuration을 소스 코드 수준에서 따라갑니다.',
  order: 1,
  // Checked on spring.io (Spring Boot 4.1.2) and in spring-boot v4.1.2 gradle.properties
  // (springFrameworkVersion=7.0.10, tomcatVersion=11.0.27).
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  checkedOn: '2026-11-03',
  lessons: ['request-flow'],
  // One map for every Spring lesson, laid out on the iso ground grid (300-unit cells): the request
  // runs along the ground x axis (outside → inside, caller → callee), the lookup sits one cell
  // back, the conversions one cell forward. The Tomcat JVM slab holds every in-process node; the
  // client and the database are other processes. service, repository, and database are for later
  // lessons (@Transactional).
  layout: {
    width: 2700,
    height: 1650,
    nodes: [
      { id: 'client', label: 'Client', sublabel: 'HTTP/1.1', kind: 'client', icon: 'laptop', x: 300, y: 220 },
      { id: 'tomcat', label: 'Tomcat', sublabel: 'http-nio-8080', kind: 'container', icon: 'server', x: 560, y: 370 },
      { id: 'filters', label: 'Filter chain', sublabel: 'Servlet Filter', kind: 'container', icon: 'filter-stack', x: 820, y: 520 },
      { id: 'dispatcher', label: 'DispatcherServlet', sublabel: 'doDispatch()', kind: 'framework', icon: 'hub', x: 1079, y: 670 },
      { id: 'mapping', label: 'HandlerMapping', sublabel: 'getHandler()', kind: 'framework', icon: 'index', x: 1339, y: 520 },
      { id: 'adapter', label: 'HandlerAdapter', sublabel: 'handle()', kind: 'framework', icon: 'adapter', x: 1339, y: 820 },
      { id: 'resolver', label: '@RequestBody', sublabel: 'HttpMessageConverter', kind: 'framework', icon: 'converter', x: 1079, y: 970 },
      { id: 'controller', label: 'OrderController', sublabel: '@RestController', kind: 'app', icon: 'controller', x: 1599, y: 970 },
      { id: 'returns', label: '@ResponseBody', sublabel: 'HttpMessageConverter', kind: 'framework', icon: 'converter', x: 1339, y: 1120 },
      { id: 'service', label: 'OrderService', sublabel: '@Service', kind: 'app', icon: 'service', x: 1859, y: 1120 },
      { id: 'repository', label: 'OrderRepository', sublabel: '@Repository', kind: 'app', icon: 'repository', x: 2119, y: 1270 },
      { id: 'database', label: 'Database', sublabel: 'JDBC', kind: 'storage', icon: 'database', x: 2378, y: 1420 },
    ],
    regions: [
      {
        id: 'jvm',
        label: 'Tomcat JVM process',
        nodes: ['tomcat', 'filters', 'dispatcher', 'mapping', 'adapter', 'resolver', 'controller', 'returns', 'service', 'repository'],
      },
    ],
  },
};
